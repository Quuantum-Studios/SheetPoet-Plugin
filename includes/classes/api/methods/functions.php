<?php

/**
 *  functions for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Functions_Model
{
    /**
     * @var    object
     * @access  private
     * @since    1.0.0
     */
    private static $_instance = null;

    /**
     * @var string
     */
    private $functions_option_name = 'spgs_functions';

    /**
     * @var SPGS_Function_Validator
     */
    private $function_validator = null;

    /**
     * Constructor
     */
    public function __construct() {
        $this->function_validator = SPGS()->function_validator();
    }

    /**
     * Ensures only one instance is loaded or can be loaded.
     *
     * @since 1.0.0
     */
    public static function instance() {
        if ( is_null(self::$_instance) ) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function get_function( $method ) {
        $functions = $this->get_functions();

        foreach ( $functions as $index => $function ) {
            if ( isset($function['name']) && $function['name'] === $method ) {
                return array(
                    'index' => $index,
                    ...$function,
                );
            }
        }

        return false;
    }

    /**
     * Execute a custom function
     *
     * @param string $function_name The name of the function to execute
     * @param string $function_code The PHP code of the function
     * @param array|null $params Parameters to pass to the function
     * @return mixed The result of the function execution
     * @throws Exception If function execution fails
     */
    public function execute_function( $function_name, $function_code, $params = null ) {
        try {
            if ( empty($function_code) ) {
                throw new Exception("Function {$function_name} is empty");
            }

            if ( empty($function_name) ) {
                throw new Exception("Function name is empty");
            }

            if ( $params !== null && ! is_array($params) ) {
                throw new Exception("Function {$function_name} expects an array as parameter");
            }

            $execute = apply_filters('spgs_should_execute_function', true, $function_name, $params);
            if ( ! $execute ) {
                throw new Exception("Function execution prevented by filter");
            }

            $params = apply_filters('spgs_before_function_execution_params', $params, $function_name);
            do_action('spgs_before_function_execution', $function_name, $params);

            if ( ! function_exists($function_name) ) {
                do_action('spgs_before_function_code_evaluation', $function_name, $function_code);

                // Create a temporary file instead of using eval
                $temp_file = wp_tempnam('spgs-function-' . sanitize_file_name($function_name));

                // Write the function code to the temporary file
                file_put_contents($temp_file, "<?php\n" . $function_code);

                // Include the temporary file
                include_once $temp_file;

                // Delete the temporary file
                if ( function_exists('wp_delete_file') ) {
                    wp_delete_file($temp_file);
                } else {
                    @unlink($temp_file);
                }

                if ( ! function_exists($function_name) ) {
                    throw new Exception("Function {$function_name} could not be created");
                }

                do_action('spgs_after_function_code_evaluation', $function_name);
            }

            $result = null;
            if ( $params === null ) {
                $result = call_user_func($function_name);
            } else {
                $result = call_user_func($function_name, $params);
            }

            $result = apply_filters('spgs_after_function_execution_result', $result, $function_name, $params);
            do_action('spgs_after_function_execution', $function_name, $params, $result);

            return $result;
        } catch ( Exception $e ) {
            error_log('SheetPoet: Error executing function ' . $function_name . ': ' . $e->getMessage());

            // Action on function execution error
            do_action('spgs_function_execution_error', $function_name, $params, $e);

            throw $e;
        }
    }

    /**
     * Get list of available functions
     */
    public function api_get_functions() {
        $functions = $this->get_functions();
        return new WP_REST_Response($functions, 200);
    }

    public function get_functions() {
        $functions = get_option($this->functions_option_name, array());
        return apply_filters('spgs_get_functions', $functions);
    }

    public function get_public_functions() {
        $functions = $this->get_functions();

        $functions = array_map(function ( $function ) {
            return array(
                'name'  => $function['name'],
                'label' => $function['label'],
                'type'  => $function['type'],
            );
        }, $functions);
        $functions = apply_filters('spgs_get_public_functions', $functions);

        return new WP_REST_Response($functions, 200);
    }

    /**
     * Save a function
     */
    public function save_function( $request ) {
        $data = $request->get_json_params();

        if ( empty($data['name']) || empty($data['code']) ) {
            return new WP_REST_Response(array(
                'error' => 'Function name and code are required',
            ), 400);
        }

        $existing_function = SPGS()->functions_model()->get_function($data['name']);
        if ( ! isset($data['id']) || empty($data['id']) ) {
            if ( $existing_function ) {
                return new WP_REST_Response(array(
                    'error' => "Function name '{$data['name']}' is already in use by another saved function.",
                ), 400);
            }
        }

        // Validate function using the validator class
        $validation = $this->function_validator->validate_function_code($data['name'], $data['code']);
        if ( ! $validation['valid'] ) {
            return new WP_REST_Response(array(
                'error' => $validation['message'],
            ), 400);
        }

        $functions = $this->get_functions();
        $function_index = $existing_function ? $existing_function['index'] : -1;

        $function_data = array(
            'name'  => sanitize_text_field($data['name']),
            'label' => sanitize_text_field($data['label'] ?? $data['name']),
            'code'  => $data['code'],
            'type'  => sanitize_text_field($data['type'] ?? 'upload_to_website'),
        );
        $function_data = apply_filters('spgs_before_save_function', $function_data, $data, $function_index >= 0);
        do_action('spgs_before_function_save', $function_data, $function_index >= 0);

        if ( $function_index >= 0 ) {
            // Update existing function
            $functions[ $function_index ] = $function_data;
        } else {
            // Add new function
            $functions[] = $function_data;
        }

        update_option($this->functions_option_name, $functions);

        do_action('spgs_after_function_save', $function_data, $function_index >= 0);

        return new WP_REST_Response($function_data, 200);
    }

    /**
     * Handle function actions (delete, etc.)
     */
    public function handle_function_action( $request ) {
        $data = $request->get_json_params();

        if ( empty($data['action']) ) {
            return new WP_REST_Response(array(
                'error' => 'Action is required',
            ), 400);
        }

        $action = sanitize_text_field($data['action']);

        switch ( $action ) {
            case 'delete':
                return $this->delete_function($data);
            default:
                return new WP_REST_Response(array(
                    'error' => 'Invalid action',
                ), 400);
        }
    }

    /**
     * Delete a function
     */
    private function delete_function( $data ) {
        if ( empty($data['id']) ) {
            return new WP_REST_Response(array(
                'error' => 'Function name is required',
            ), 400);
        }

        $name = sanitize_text_field($data['id']);
        $functions = $this->get_functions();
        $found = SPGS()->functions_model()->get_function($name);

        if ( ! $found ) {
            return new WP_REST_Response(array(
                'error' => 'Function not found',
            ), 404);
        }
        do_action('spgs_before_function_delete', $found);
        unset($functions[ $found['index'] ]);

        // Reindex array
        $functions = array_values($functions);

        update_option($this->functions_option_name, $functions);

        do_action('spgs_after_function_delete', $found);

        return new WP_REST_Response(array(
            'message' => 'Function deleted successfully',
        ), 200);
    }

    /**
     * Validate a function
     */
    public function validate_function( $request ) {
        $data = $request->get_json_params();

        if ( empty($data['name']) || empty($data['code']) ) {
            return new WP_REST_Response(array(
                'valid'   => false,
                'message' => 'Function name and code are required',
            ), 200);
        }

        if ( ! isset($data['id']) || empty($data['id']) ) {
            $existing_function = SPGS()->functions_model()->get_function($data['name']);
            if ( $existing_function ) {
                return new WP_REST_Response(array(
                    'valid'   => false,
                    'message' => "Function name '{$data['name']}' is already in use by another saved function.",
                ), 200);
            }
        }

        $data = apply_filters('spgs_before_validate_function', $data);

        // Use the function validator class
        $validation = $this->function_validator->validate_function_code($data['name'], $data['code']);

        $validation = apply_filters('spgs_function_validation_result', $validation, $data);

        return new WP_REST_Response($validation, 200);
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Functions_Model is not allowed.');
    }
}
