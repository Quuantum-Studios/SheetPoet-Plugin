<?php

defined('ABSPATH') || exit;

class SPGS_Process_Model
{
    private static $instance = null;

    private function __construct() {}

    public static function instance() {
        if ( is_null(self::$instance) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function run_function( $request ) {
        $task_id = $request->get_param('task_id');
        $name = $request->get_param('method');
        $type = $request->get_param('type');
        $params = $request->get_param('params');
        $meta = $request->get_param('meta');
        $meta = is_string($meta) ? json_decode($meta, true) : $meta;

        do_action('spgs_before_process_request', $task_id, $name, $type, $params, $request);

        $task_id = apply_filters('spgs_process_task_id', $task_id, $request);
        $name = apply_filters('spgs_process_function_name', $name, $request);
        $type = apply_filters('spgs_process_function_type', $type, $request);
        $params = apply_filters('spgs_process_params', $params, $name, $type, $request);
        $meta = apply_filters('spgs_process_meta', $meta, $name, $type, $request);

        $response = [
			'success' => false,
			'message' => '',
		];
        $function = null;

        $error = $this->validate_request($task_id, $name, $type, $params);
        if ( $error ) {
            $response['message'] = $error;
        } else {
            $function = SPGS()->functions_model()->find_function_by('name', $name);
            if ( ! $function ) {
                $response['message'] = "Function '{$name}' not found";
            } elseif ( $function['type'] !== $type ) {
                $response['message'] = "Function '{$name}' is not a {$type} function";
            } else {
                $response = $this->execute_function_unified($function, $type, $params);
            }
        }

        $function_data = $function ? $function : [
			'name'  => $name,
			'type'  => $type,
			'label' => $name,
		];
        $response = apply_filters('spgs_process_response', $response, $function_data, $params);

        $critical_meta = $this->extract_critical_meta($meta);
        SPGS()->logs_model()->log_request(
            $task_id,
            $function_data,
            $response['success'] ? 'success' : 'error',
            $params,
            $response['data'] ?? $response['message'],
            $critical_meta
        );

        do_action('spgs_after_process_request', $task_id, $function_data, $params, $response);
        return new WP_REST_Response($response, $response['success'] ? 200 : 400);
    }

    private function validate_request( $task_id, $name, $type, $params ) {
        if ( empty($task_id) ) {
            return 'Missing required parameter: task_id';
        }
        if ( empty($name) || empty($type) ) {
            return 'Missing required parameters: method and type';
        }
        if ( empty($params) || ! is_array($params) ) {
            return 'Invalid params parameter. Expected: array';
        }

        $allowed_types = apply_filters('spgs_allowed_function_types', [
            'upload_to_website',
            'one_time_trigger',
            'import_to_sheet',
        ]);

        if ( ! in_array($type, $allowed_types) ) {
            return 'Invalid type parameter';
        }

        return null;
    }

    private function extract_critical_meta( $meta ) {
        if ( ! isset($meta['user']) || ! is_array($meta['user']) || ! isset($meta['user']['profile']) ) {
            return null;
        }

        return [
            'user' => [
                'id'      => $meta['user']['profile']['id'] ?? '',
                'name'    => $meta['user']['profile']['name'] ?? '',
                'email'   => $meta['user']['email'] ?? '',
                'picture' => $meta['user']['profile']['picture'] ?? '',
            ],
        ];
    }

    private function execute_function_unified( $function, $type, $params ) {
        do_action('spgs_before_execute_function', $function, $type, $params);

        try {
            $response = match ($type) {
                'upload_to_website' => $this->handle_upload_to_website($function, $params),
                'import_to_sheet' => $this->handle_import_to_sheet($function, $params),
                'one_time_trigger' => [
                    'success' => true,
                    'data'    => SPGS()->functions_model()->execute_function($function['name'], $params),
                ],
                default => apply_filters('spgs_process_custom_function_type', null, $function, $type, $params)
            };

            if ( $response === null ) {
                $response = [
					'success' => false,
					'message' => "Unsupported function type: {$type}",
				];
            }
        } catch ( Exception $e ) {
            $response = [
				'success' => false,
				'message' => $e->getMessage(),
			];
        }

        do_action('spgs_after_execute_function', $function, $type, $params, $response);
        return $response;
    }

    private function handle_upload_to_website( $function, $records ) {
        $identifiers = array_column($records, 'identifier');
        if ( count($identifiers) !== count(array_unique($identifiers)) ) {
            return [
				'success' => false,
				'message' => 'Identifiers in records are not unique',
			];
        }

        foreach ( $records as $record ) {
            if ( empty($record['identifier']) ) {
                return [
					'success' => false,
					'message' => 'Missing identifier in one or more records',
				];
            }
        }

        $responses = [];
        foreach ( $records as $record ) {
            $identifier = $record['identifier'];
            try {
                $result = SPGS()->functions_model()->execute_function($function['name'], $record);
                $responses[] = array_merge(
                    is_array($result) ? $result : [ 'message' => $result ],
                    [ 'identifier' => $identifier ]
                );
            } catch ( Exception $e ) {
                $responses[] = [
                    'identifier' => $identifier,
                    'success'    => false,
                    'message'    => $e->getMessage(),
                ];
            }
        }

        return [
			'success' => true,
			'data'    => $responses,
		];
    }

    private function handle_import_to_sheet( $function, $params ) {
        if ( empty($params['index']) && $params['index'] !== 0 ) {
            return [
				'success' => false,
				'message' => 'Missing required parameter: index',
			];
        }

        if ( empty($params['batchSize']) ) {
            return [
				'success' => false,
				'message' => 'Missing required parameter: batchSize',
			];
        }

        $result = SPGS()->functions_model()->execute_function($function['name'], $params);
        return [
			'success' => true,
			'data'    => $result,
		];
    }

    public function __clone() {
        throw new \Error('Cloning SPGS_Process_Model is not allowed.');
    }

    public function __wakeup() {
        throw new \Error('Unserializing SPGS_Process_Model is not allowed.');
    }
}
