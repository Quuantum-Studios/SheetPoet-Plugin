<?php

/**
 * API Routes for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_API
{
    /**
     * @var    object
     * @access  private
     * @since    1.0.0
     */
    private static $_instance = null;

   private $settings_model = null;
    private $functions_model = null;
    private $keys_model = null;
    private $logs_model = null;
    private $process_model = null;

    private $auth = null;

    /**
     * Constructor
     */
    public function __construct() {
        $spgs = SPGS();
        $this->settings_model = $spgs->settings_model();
        $this->functions_model = $spgs->functions_model();
        $this->keys_model = $spgs->keys_model();
        $this->logs_model = $spgs->logs_model();
        $this->process_model = $spgs->process_model();

        $this->auth = $spgs->auth();
    }

    public function init() {
        add_action('rest_api_init', array( $this, 'register_routes' ));
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
     * Register all API routes
     */
    public function register_routes() {
        // Admin-only routes (require administrator permission)
        $this->register_admin_routes();

        // Public routes (require API key and plugin enabled)
        $this->register_public_routes();
    }

    /**
     * Register admin-only routes
     *
     * @param SPGS_API $api The API instance
     */
    private function register_admin_routes() {
        // Settings
        register_rest_route(SPGS_REST_API_ROUTE, '/settings', array(
            'methods'             => 'GET',
            'callback'            => array( $this->settings_model, 'api_get_settings' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/settings', array(
            'methods'             => 'POST',
            'callback'            => array( $this->settings_model, 'set_settings' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));

        // Functions (admin-only operations)
        register_rest_route(SPGS_REST_API_ROUTE, '/functions', array(
            'methods'             => 'GET',
            'callback'            => array( $this->functions_model, 'api_get_functions' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/functions', array(
            'methods'             => 'POST',
            'callback'            => array( $this->functions_model, 'save_function' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/functions/action', array(
            'methods'             => 'POST',
            'callback'            => array( $this->functions_model, 'handle_function_action' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/functions/validate', array(
            'methods'             => 'POST',
            'callback'            => array( $this->functions_model, 'validate_function' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));

        // API Keys
        register_rest_route(SPGS_REST_API_ROUTE, '/api-keys', array(
            'methods'             => 'GET',
            'callback'            => array( $this->keys_model, 'get_api_keys' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/api-keys', array(
            'methods'             => 'POST',
            'callback'            => array( $this->keys_model, 'generate_api_key' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/api-keys/action', array(
            'methods'             => 'POST',
            'callback'            => array( $this->keys_model, 'handle_api_key_action' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));

        // Logs
        register_rest_route(SPGS_REST_API_ROUTE, '/logs', array(
            'methods'             => 'GET',
            'callback'            => array( $this->logs_model, 'get_logs' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
        register_rest_route(SPGS_REST_API_ROUTE, '/logs/action', array(
            'methods'             => 'POST',
            'callback'            => array( $this->logs_model, 'handle_logs_action' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
            'show_in_index'       => false,
        ));
    }

    /**
     * Register public routes (API key required)
     */
    private function register_public_routes() {
        register_rest_route(SPGS_REST_API_ROUTE, '/sheets-client/settings', array(
            'methods'             => 'GET',
            'callback'            => array( $this->settings_model, 'get_public_settings' ),
            'permission_callback' => array( $this->auth, 'get_permission' ),
        ));

        // Functions (GET - public with API key)
        register_rest_route(SPGS_REST_API_ROUTE, '/sheets-client/functions', array(
            'methods'             => 'GET',
            'callback'            => array( $this->functions_model, 'get_public_functions' ),
            'permission_callback' => array( $this->auth, 'check_plugin_enabled_and_api_key' ),
        ));

        // Process data (POST - public with API key)
        register_rest_route(SPGS_REST_API_ROUTE, '/sheets-client/run-function', array(
            'methods'             => 'POST',
            'callback'            => array( $this->process_model, 'run_function' ),
            'permission_callback' => array( $this->auth, 'check_plugin_enabled_and_api_key' ),
        ));
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_API_Routes is not allowed.');
    }
}
