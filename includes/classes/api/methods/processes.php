<?php

/**
 * Process API for SheetPoet
 *
 * Handles the processing of data via the REST API
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Process_Model
{
    /**
     * Class instance
     *
     * @var    self
     * @access private
     * @since  1.0.0
     */
    private static $instance = null;

    // No additional properties needed

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {}

    /**
     * Ensures only one instance is loaded or can be loaded.
     *
     * @since 1.0.0
     * @return self
     */
    public static function instance() {
        if ( is_null(self::$instance) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Handle data processing requests
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response The response
     */
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

        // Validation checks - collect all potential errors
        if ( empty($task_id) ) {
            $response['message'] = 'Missing required parameter: task_id';
        } elseif ( empty($name) || empty($type) ) {
            $response['message'] = 'Missing required parameters: method and type';
        } elseif ( empty($params) || ! is_array($params) ) {
            $response['message'] = 'Invalid params parameter. Expected: array';
        } elseif ( ! in_array($type, apply_filters('spgs_allowed_function_types', [ 'upload_to_website', 'one_time_trigger', 'import_to_sheet' ])) ) {
            $response['message'] = 'Invalid type parameter';
        } else {
            $function = SPGS()->functions_model()->get_function($name);
            if ( ! $function ) {
                $response['message'] = "Function '{$name}' not found";
            } elseif ( $function['type'] !== $type ) {
                $response['message'] = "Function '{$name}' is not a {$type} function";
            } else {
                do_action('spgs_before_execute_function', $function, $type, $params);

                switch ( $type ) {
                    case 'one_time_trigger':
                        $response = $this->one_time_trigger($function, $params);
                        break;
                    case 'upload_to_website':
                        $response = $this->upload_to_website($function, $params);
                        break;
                    case 'import_to_sheet':
                        $response = $this->import_to_sheet($function, $params);
                        break;
                    default:
                        $custom_response = apply_filters('spgs_process_custom_function_type', null, $function, $type, $params);
                        if ( $custom_response !== null ) {
                            $response = $custom_response;
                        }
                        break;
                }

                do_action('spgs_after_execute_function', $function, $type, $params, $response);
            }
        }

        $function_data = $function ? $function : [
			'name'  => $name,
			'type'  => $type,
			'label' => $name,
		];
        $response = apply_filters('spgs_process_response', $response, $function_data, $params);

        $critical_meta = null;
        if ( $meta['user'] && is_array($meta['user']) ) {
            if ( isset($meta['user']['profile']) ) {
                $critical_meta = [
                    'user' => [
                        'id'      => $meta['user']['profile']['id'] ?? '',
                        'name'    => $meta['user']['profile']['name'] ?? '',
                        'email'   => $meta['user']['email'] ?? '',
                        'picture' => $meta['user']['profile']['picture'] ?? '',
                    ],
                ];
            }
        }

        SPGS()->logs_model()->log_request($task_id, $function_data, $response['success'] ? 'success' : 'error', $params, $response['data'] ?? $response['message'], $critical_meta);
        do_action('spgs_after_process_request', $task_id, $function_data, $params, $response);
        return new WP_REST_Response($response, $response['success'] ? 200 : 400);
    }

    private function upload_to_website( $function, $records ) {
        $name = $function['name'];
        $code = $function['code'];

        // check $records have unique identifiers
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
        $responses = array();
        foreach ( $records as $record ) {
            $identifier = $record['identifier'];
            try {
                $result = SPGS()->functions_model()->execute_function($name, $code, $record);
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

    private function import_to_sheet( $function, $params ) {
        $name = $function['name'];
        $code = $function['code'];

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

        try {
            $result = SPGS()->functions_model()->execute_function($name, $code, $params);

            return [
                'success' => true,
                'data'    => $result,
            ];
        } catch ( Exception $e ) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    private function one_time_trigger( $function, $params ) {
        $name = $function['name'];
        $code = $function['code'];

        try {
            $result = SPGS()->functions_model()->execute_function($name, $code, $params);

            return [
                'success' => true,
                'data'    => $result,
            ];
        } catch ( Exception $e ) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }


    /**
     * Prevent cloning of the instance
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Process_Model is not allowed.');
    }

    /**
     * Prevent unserializing of the instance
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __wakeup() {
        throw new \Error('Unserializing SPGS_Process_Model is not allowed.');
    }
}
