<?php

/**
 * Logs API Helper for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Logs_Model
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
    private $logs_table_name;

    /**
     * @var SPGS_Utils
     */
    private $utils = null;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->logs_table_name = $wpdb->prefix . 'spgs_logs';

        $this->utils = SPGS()->utils();

        // Create logs table if it doesn't exist
        $this->utils->create_logs_table();
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

    /**
     * Get logs
     */
    public function get_logs( $request ) {
        global $wpdb;

        $page = isset($request['page']) ? intval($request['page']) : 1;
        $per_page = isset($request['per_page']) ? intval($request['per_page']) : 20;
        $group_by_task_id = isset($request['group_by_task_id']) ? filter_var($request['group_by_task_id'], FILTER_VALIDATE_BOOLEAN) : false;
        $task_id = isset($request['task_id']) ? sanitize_text_field($request['task_id']) : null;

        // If a specific task_id is requested, return logs for that task only
        if ( $task_id ) {
            // Prepare table name
            $table_name = $wpdb->prefix . 'spgs_logs';

            $logs = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}spgs_logs WHERE task_id = %s ORDER BY timestamp DESC",
                    $task_id
                ),
                ARRAY_A
            );

            return new WP_REST_Response(array(
                'logs'    => $logs,
                'task_id' => $task_id,
            ), 200);
        }

        $offset = ($page - 1) * $per_page;

        // Prepare table name
        $table_name = $wpdb->prefix . 'spgs_logs';

        // Get total count of logs or groups
        if ( $group_by_task_id ) {
            $total = $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT task_id) FROM {$wpdb->prefix}spgs_logs"));
        } else {
            $total = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}spgs_logs"));
        }

        if ( $group_by_task_id ) {
            // Get task_ids for the current page
            $task_ids = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT task_id FROM (
                        SELECT task_id, MAX(timestamp) as latest
                        FROM {$wpdb->prefix}spgs_logs
                        GROUP BY task_id
                        ORDER BY latest DESC
                        LIMIT %d OFFSET %d
                    ) as t",
                    $per_page,
                    $offset
                )
            );

            if ( empty($task_ids) ) {
                return new WP_REST_Response(array(
                    'logs'    => [],
                    'total'   => intval($total),
                    'pages'   => ceil($total / $per_page),
                    'grouped' => true,
                ), 200);
            }

            // Prepare query args
            $query_args = $task_ids;

            // Get summary information for these task_ids
            $logs_by_task = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT task_id, COUNT(*) as count,
                     MAX(timestamp) as latest_timestamp,
                     GROUP_CONCAT(DISTINCT function_name SEPARATOR ', ') as function_names,
                     GROUP_CONCAT(DISTINCT function_label SEPARATOR ', ') as function_labels,
                     GROUP_CONCAT(DISTINCT function_type SEPARATOR ', ') as function_types,
                     GROUP_CONCAT(DISTINCT status SEPARATOR ', ') as statuses
                     FROM {$wpdb->prefix}spgs_logs
                     WHERE task_id IN (" . implode(',', array_fill(0, count($task_ids), '%s')) . ")
                     GROUP BY task_id
                     ORDER BY latest_timestamp DESC",
                    ...$query_args
                ),
                ARRAY_A
            );

            // Create grouped logs without individual log entries
            $grouped_logs = [];
            foreach ( $logs_by_task as $task_summary ) {
                $grouped_logs[] = [
                    'task_id'          => $task_summary['task_id'],
                    'count'            => intval($task_summary['count']),
                    'latest_timestamp' => $task_summary['latest_timestamp'],
                    'function_names'   => $task_summary['function_names'],
                    'function_labels'  => $task_summary['function_labels'],
                    'function_types'   => $task_summary['function_types'],
                    'success'          => strpos($task_summary['statuses'], 'error') === false,
                ];
            }

            return new WP_REST_Response(array(
                'logs'    => $grouped_logs,
                'total'   => intval($total),
                'pages'   => ceil($total / $per_page),
                'grouped' => true,
            ), 200);
        } else {
            // Regular non-grouped logs
            $logs = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}spgs_logs ORDER BY timestamp DESC LIMIT %d OFFSET %d",
                    $per_page,
                    $offset
                ),
                ARRAY_A
            );

            return new WP_REST_Response(array(
                'logs'    => $logs,
                'total'   => intval($total),
                'pages'   => ceil($total / $per_page),
                'grouped' => false,
            ), 200);
        }
    }

    /**
     * Handle logs actions (clear, etc.)
     */
    public function handle_logs_action( $request ) {
        $data = $request->get_json_params();

        if ( empty($data['action']) ) {
            return new WP_REST_Response(array(
                'error' => 'Action is required',
            ), 400);
        }

        $action = $data['action'];

        switch ( $action ) {
            case 'clear':
                return $this->clear_logs();
            default:
                return new WP_REST_Response(array(
                    'error' => 'Invalid action',
                ), 400);
        }
    }

    /**
     * Clear logs
     */
    private function clear_logs() {
        global $wpdb;

        $wpdb->query($wpdb->prepare("TRUNCATE TABLE {$wpdb->prefix}spgs_logs"));

        return new WP_REST_Response(array(
            'message' => 'Logs cleared successfully',
        ), 200);
    }

    /**
     * Log a request to the database
     *
     * @param string $task_id The task ID
     * @param array $function The function data (name, label, type)
     * @param string $status The status of the request (success, error)
     * @param mixed $request_data The request data
     * @param mixed $response_data The response data
     * @param mixed $meta_data Optional meta data to store with the log
     * @return int|false The log ID or false on failure
     */
    public function log_request( $task_id, $function, $status, $request_data, $response_data, $meta_data = null ) {
        global $wpdb;

        do_action('spgs_before_log_request', $task_id, $function, $status, $request_data, $response_data, $meta_data);

        ['name' => $name, 'label' => $label, 'type' => $type] = $function;

        $this->utils->create_logs_table();

        $request_data = apply_filters('spgs_log_request_data', $request_data, $task_id, $function, $status);
        $response_data = apply_filters('spgs_log_response_data', $response_data, $task_id, $function, $status);
        $meta_data = apply_filters('spgs_log_meta_data', $meta_data, $task_id, $function, $status);

        $request_json = is_array($request_data) || is_object($request_data)
            ? wp_json_encode($request_data)
            : (string) $request_data;

        $response_json = is_array($response_data) || is_object($response_data)
            ? wp_json_encode($response_data)
            : (string) $response_data;

        $meta_json = is_array($meta_data) || is_object($meta_data)
            ? wp_json_encode($meta_data)
            : (is_null($meta_data) ? '' : (string) $meta_data);

        $log_data = array(
            'timestamp'      => current_time('mysql'),
            'task_id'        => $task_id,
            'request_data'   => $request_json,
            'response_data'  => $response_json,
            'function_name'  => $name,
            'status'         => $status,
            'function_label' => $label,
            'function_type'  => $type,
            'meta_data'      => $meta_json,
        );

        $log_data = apply_filters('spgs_log_data', $log_data, $task_id, $function, $status);

        if ( $log_data === false ) {
            do_action('spgs_log_request_skipped', $task_id, $function, $status, $request_data, $response_data);
            return false;
        }

        $result = $wpdb->insert(
            $this->logs_table_name,
            $log_data,
            array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( $result === false ) {
            // Only log in debug mode
            if ( defined('WP_DEBUG') && WP_DEBUG ) {
                error_log('SheetPoet: Failed to save log entry: ' . $wpdb->last_error);
            }
            do_action('spgs_log_request_failed', $task_id, $function, $status, $request_data, $response_data, $wpdb->last_error);
            return false;
        }

        $log_id = $wpdb->insert_id;
        do_action('spgs_after_log_request', $log_id, $task_id, $function, $status, $request_data, $response_data);

        return $log_id;
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Logs_Model is not allowed.');
    }
}
