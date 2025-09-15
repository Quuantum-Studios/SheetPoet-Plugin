<?php
defined('ABSPATH') || exit;

final class SPGS_Functions_Model
{
    private static ?self $_instance = null;
    private string $functions_option_name = 'spgs_functions';
    private array $cache = [];

    private function __construct() {}

    public static function instance(): self
    {
        return self::$_instance ??= new self();
    }

    public function execute_function( string $function_name, ?array $params = null ) {
        if ( empty($function_name) ) {
            throw new InvalidArgumentException("Function name cannot be empty");
        }

        $registered_function = $this->find_function_by('name', $function_name);
        if ( ! $registered_function ) {
            throw new InvalidArgumentException(sprintf("Function '%s' is not registered", esc_html($function_name)));
        }

        if ( ! ($registered_function['enabled'] ?? false) ) {
            throw new RuntimeException(sprintf("Function '%s' is disabled", esc_html($function_name)));
        }

        if ( ! apply_filters('spgs_should_execute_function', true, $function_name, $params) ) {
            throw new RuntimeException("Function execution prevented by filter");
        }

        try {
            $params = apply_filters('spgs_before_function_execution_params', $params, $function_name);
            do_action('spgs_before_function_execution', $function_name, $params);

            $filter_name = "spgs/functions/{$function_name}";
            if ( ! has_filter($filter_name) ) {
                throw new RuntimeException(sprintf("Function '%s' is not defined via filter", esc_html($function_name)));
            }

            $result = apply_filters($filter_name, $params);
            if ( $result === null ) {
                throw new RuntimeException(sprintf("Function '%s' did not return a result", esc_html($function_name)));
            }

            $result = apply_filters('spgs_after_function_execution_result', $result, $function_name, $params);
            do_action('spgs_after_function_execution', $function_name, $params, $result);

            return $result;
        } catch ( Exception $e ) {
            if ( defined('WP_DEBUG') && WP_DEBUG ) {
                error_log(sprintf("SheetPoet: Error executing function %s: %s", esc_html($function_name), $e->getMessage()));
            }
            do_action('spgs_function_execution_error', $function_name, $params, $e);
            throw $e;
        }
    }

    public function api_get_functions(): WP_REST_Response
    {
        return new WP_REST_Response($this->get_functions(), 200);
    }

    public function api_get_functions_from_filters(): WP_REST_Response
    {
        return new WP_REST_Response($this->get_function_names_from_filters(), 200);
    }

    public function get_functions(): array
    {
        if ( ! isset($this->cache['functions']) ) {
            $this->cache['functions'] = get_option($this->functions_option_name, []);
        }
        return apply_filters('spgs_get_functions', $this->cache['functions']);
    }

    public function get_function_names_from_filters(): array
    {
        global $wp_filter;

        if ( ! is_array($wp_filter) ) {
            return [];
        }

        $functions_data = [];
        $pattern = 'spgs/functions/';
        $pattern_length = strlen($pattern);

        foreach ( $wp_filter as $filter_name => $filter_data ) {
            if ( str_starts_with($filter_name, $pattern) ) {
                $function_name = substr($filter_name, $pattern_length);

                if ( ! empty($function_name) ) {
                    $functions_data[ $function_name ] = [
                        'filter_name'    => $filter_name,
                        'callback_count' => count($filter_data->callbacks ?? []),
                        'has_callbacks'  => ! empty($filter_data->callbacks),
                    ];
                }
            }
        }

        ksort($functions_data);
        return $functions_data;
    }

    public function get_public_functions(): WP_REST_Response
    {
        $functions = array_filter($this->get_functions(), fn($function) => $function['enabled'] ?? true);

        $public_functions = array_map(fn($function) => [
            'id'    => $function['id'],
            'name'  => $function['name'],
            'label' => $function['label'],
            'type'  => $function['type'],
        ], $functions);

        return new WP_REST_Response(
            apply_filters('spgs_get_public_functions', $public_functions),
            200
        );
    }

    public function save_function( WP_REST_Request $request ): WP_REST_Response
    {
        $data = $request->get_json_params();

        if ( empty($data['name']) ) {
            return new WP_REST_Response([ 'error' => 'Function name is required' ], 400);
        }

        if ( empty($data['label']) ) {
            return new WP_REST_Response([ 'error' => 'Function label is required' ], 400);
        }

        $name = sanitize_text_field($data['name']);
        $label = sanitize_text_field($data['label']);
        $id = ! empty($data['id']) ? sanitize_text_field($data['id']) : null;

        if ( ! $id ) {
            if ( $this->find_function_by('name', $name) ) {
                return new WP_REST_Response([
                    'error' => "Function '{$name}' is already registered",
                ], 400);
            }

            if ( $this->find_function_by('label', $label) ) {
                return new WP_REST_Response([
                    'error' => 'Another function is already registered with this label',
                ], 400);
            }
        }

        $function_data = [
            'id'      => $id ? $id : uniqid(),
            'name'    => $name,
            'label'   => $label,
            'type'    => sanitize_text_field($data['type'] ?? 'upload_to_website'),
            'enabled' => $data['enabled'] ?? true,
        ];

        $function_data = apply_filters('spgs_before_save_function', $function_data);
        do_action('spgs_before_function_save', $function_data);

        $saved_functions = $this->get_functions();
        $existing_function = $this->find_function_by('id', $function_data['id']);

        if ( $existing_function ) {
            $saved_functions[ $existing_function['index'] ] = $function_data;
        } else {
            $saved_functions[] = $function_data;
        }

        $this->update_functions_option($saved_functions);
        do_action('spgs_after_function_save', $function_data);

        return new WP_REST_Response($function_data, 200);
    }

    public function handle_function_action( WP_REST_Request $request ): WP_REST_Response
    {
        $data = $request->get_json_params();

        if ( empty($data['action']) ) {
            return new WP_REST_Response([ 'error' => 'Action is required' ], 400);
        }

        return match (sanitize_text_field($data['action'])) {
            'delete' => $this->delete_function($data),
            'toggle_enabled' => $this->toggle_function_enabled($data),
            default => new WP_REST_Response([ 'error' => 'Invalid action' ], 400)
        };
    }

    public function find_function_by( string $field, string $value ): ?array
    {
        $functions = $this->get_functions();

        foreach ( $functions as $index => $function ) {
            if ( ($function[ $field ] ?? null) === $value ) {
                return array_merge($function, [ 'index' => $index ]);
            }
        }

        return null;
    }

    private function delete_function( array $data ): WP_REST_Response
    {
        if ( empty($data['id']) ) {
            return new WP_REST_Response([ 'error' => 'Function id is required' ], 400);
        }

        $id = sanitize_text_field($data['id']);
        $function = $this->find_function_by('id', $id);

        if ( ! $function ) {
            return new WP_REST_Response([ 'error' => 'Function not found' ], 404);
        }

        do_action('spgs_before_function_delete', $function);

        $saved_functions = $this->get_functions();
        unset($saved_functions[ $function['index'] ]);

        $this->update_functions_option(array_values($saved_functions));
        do_action('spgs_after_function_delete', $function);

        return new WP_REST_Response([ 'message' => 'Function deleted successfully' ], 200);
    }

    private function toggle_function_enabled( array $data ): WP_REST_Response
    {
        if ( empty($data['id']) ) {
            return new WP_REST_Response([ 'error' => 'Function id is required' ], 400);
        }

        $id = sanitize_text_field($data['id']);
        $function = $this->find_function_by('id', $id);

        if ( ! $function ) {
            return new WP_REST_Response([ 'error' => 'Function not found' ], 404);
        }

        $saved_functions = $this->get_functions();
        $new_enabled_state = ! ($function['enabled'] ?? true);
        $saved_functions[ $function['index'] ]['enabled'] = $new_enabled_state;

        $this->update_functions_option($saved_functions);
        do_action('spgs_function_enabled_toggled', $function, $new_enabled_state);

        $status = $new_enabled_state ? 'enabled' : 'disabled';
        return new WP_REST_Response([
            'message' => "Function {$status} successfully",
            'enabled' => $new_enabled_state,
        ], 200);
    }

    private function update_functions_option( array $functions ): void
    {
        update_option($this->functions_option_name, $functions);
        $this->cache['functions'] = $functions;
    }

    public function __clone(): void
    {
        throw new Error('Cloning SPGS_Functions_Model is not allowed.');
    }

    public function __wakeup(): void
    {
        throw new Error('Unserializing SPGS_Functions_Model is not allowed.');
    }
}
