<?php

/**
 * Basic Authentication Handler for SheetPoet
 *
 * @package    SPGS
 * @subpackage SPGS/includes/classes/auth
 */

defined('ABSPATH') || exit;

class SPGS_Auth
{
    /**
     * @var object
     * @access private
     * @since 1.0.0
     */
    private static $_instance = null;

    /**
     * Constructor
     */
    public function __construct() {
        // Initialize
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
     * Permission Callback
     **/
    public function get_permission() {
        if ( current_user_can('administrator') ) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Check if plugin is enabled and API key is valid
     *
     * @param WP_REST_Request $request The request object
     * @return bool|WP_Error True if plugin is enabled and API key is valid, WP_Error otherwise
     */

    public function check_plugin_enabled_and_api_key( $request ) {
        // Get settings
        $settings = get_option('spgs_settings', array());
        $plugin_enabled = isset($settings['plugin_enabled']) ? $settings['plugin_enabled'] : true;

        // Check if plugin is enabled
        if ( ! $plugin_enabled ) {
            return new WP_Error(
                'rest_forbidden',
                'Functionality is disabled from the plugin settings in the website.',
                array( 'status' => 403 )
            );
        }

        if ( ! is_user_logged_in() || ! current_user_can('manage_options') ) {
            return new WP_Error(
                'rest_forbidden',
                'Not authorized',
                array( 'status' => 401 )
            );
        }

        return true;
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Auth is not allowed.');
    }
}
