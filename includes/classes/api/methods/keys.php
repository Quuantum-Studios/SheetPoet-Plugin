<?php

/**
 * API Keys Helper for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Keys_Model
{
    /**
     * @var    object
     * @access  private
     * @since    1.0.0
     */
    private static $_instance = null;

    /**
     * @var SPGS_Keys_Manager
     */
    private $api_keys_manager = null;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api_keys_manager = SPGS()->keys_manager();
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
     * Get all API keys (Application Passwords)
     */
    public function get_api_keys() {
        try {
            $api_keys = $this->api_keys_manager->get_all();

            // API keys are already formatted in the manager class
            return new WP_REST_Response($api_keys, 200);
        } catch ( Exception $e ) {
            return new WP_REST_Response(array(
                'error' => $e->getMessage(),
            ), 500);
        }
    }

    /**
     * Generate a new API key (Application Password)
     */
    public function generate_api_key( $request ) {
        try {
            $data = $request->get_json_params();
            $name = '';

            // Get the name from the request
            if ( ! empty($data) && isset($data['name']) ) {
                $name = sanitize_text_field($data['name']);
            }

            // Create the API key
            $new_key = $this->api_keys_manager->create($name);

            if ( is_wp_error($new_key) ) {
                return new WP_REST_Response(array(
                    'error' => $new_key->get_error_message(),
                ), 400);
            }

            return new WP_REST_Response($new_key, 200);
        } catch ( Exception $e ) {
            return new WP_REST_Response(array(
                'error' => $e->getMessage(),
            ), 500);
        }
    }

    /**
     * Handle API key actions (delete, etc.)
     */
    public function handle_api_key_action( $request ) {
        try {
            $data = $request->get_json_params();

            if ( empty($data['action']) ) {
                return new WP_REST_Response(array(
                    'error' => 'Action is required',
                ), 400);
            }

            $action = sanitize_text_field($data['action']);

            switch ( $action ) {
                case 'delete':
                    return $this->delete_api_key($data);
                default:
                    return new WP_REST_Response(array(
                        'error' => 'Invalid action',
                    ), 400);
            }
        } catch ( Exception $e ) {
            return new WP_REST_Response(array(
                'error' => $e->getMessage(),
            ), 500);
        }
    }

    /**
     * Delete an API key (Application Password)
     */
    private function delete_api_key( $data ) {
        try {
            if ( empty($data['id']) ) {
                return new WP_REST_Response(array(
                    'error' => 'API key ID is required',
                ), 400);
            }

            $id = $data['id'];
            $deleted = $this->api_keys_manager->delete($id);

            if ( ! $deleted ) {
                return new WP_REST_Response(array(
                    'error' => 'API key not found',
                ), 404);
            }

            return new WP_REST_Response(array(
                'message' => 'API key deleted successfully',
            ), 200);
        } catch ( Exception $e ) {
            return new WP_REST_Response(array(
                'error' => $e->getMessage(),
            ), 500);
        }
    }


    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Keys_Model is not allowed.');
    }
}
