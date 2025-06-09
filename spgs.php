<?php

/**
 * Plugin Name: SheetPoet – Spreadsheet Connector
 * Plugin URI: https://www.quuantum.com/products/sheetpoet/
 * Description: A powerful plugin that connects your WordPress site to a companion Google Sheets Add-on for seamless data processing, automation, and synchronization.
 * Version: 1.0.3
 * Author: Quuantum
 * Author URI: https://www.quuantum.com
 * Text Domain: sheetpoet
 * Domain Path: /languages
 * Requires at least: 5.9
 * Tested up to: 6.1
 * Requires PHP: 7.3
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 *
 */

defined('ABSPATH') || exit;

if ( ! class_exists('SPGS_Main') ) {
    final class SPGS_Main
    {
        /**
         * Singleton instance
         *
         * @var SPGS_Main
         */
        private static $instance;

        /**
         * Plugin version
         *
         * @var string
         */
        private $version = '1.0.3';

        /**
         * Constructor - Private to prevent direct instantiation
         */
        private function __construct() {
            $this->define_constants();
            $this->includes();

            // Hook into WordPress
            add_action('plugins_loaded', array( $this, 'init' ));
        }

        /**
         * Initialize plugin components
         */
        public function init() {
            // Initialize admin classes if in admin area
            if ( is_admin() ) {
                SPGS()->menu();
                SPGS()->assets();
            }

            $this->api()->init();

            // Fire action to allow extensions to hook in
            do_action('spgs_init');
        }

        /**
         * Include required files
         */
        private function includes() {
            // Include utility classes first
            $this->include_file('includes/classes/helpers/utils.php');
            $this->include_file('includes/classes/helpers/keys-manager.php');

            // Include auth classes
            $this->include_file('includes/classes/helpers/auth.php');

            // include helper classes
            $this->include_file('includes/classes/helpers/function-validator.php');

            // Include API classes
            $this->include_file('includes/classes/api/api.php');

            // Include api methods
            $this->include_file('includes/classes/api/methods/processes.php');
            $this->include_file('includes/classes/api/methods/keys.php');
            $this->include_file('includes/classes/api/methods/settings.php');
            $this->include_file('includes/classes/api/methods/functions.php');
            $this->include_file('includes/classes/api/methods/logs.php');

            // Include admin classes
            if ( is_admin() ) {
                $this->include_file('includes/classes/admin/menu.php');
                $this->include_file('includes/classes/admin/assets.php');

                if ( defined('SPGS_DEV') && SPGS_DEV ) {
                    $this->include_file('includes/classes/admin/assets-dev.php');
                }
            }

            // Allow extensions to include additional files
            do_action('spgs_includes');
        }

        /**
         * Include a file with error handling
         *
         * @param string $file File to include relative to plugin root
         */
        private function include_file( $file ) {
            $path = SPGS_ABSPATH . $file;

            if ( file_exists($path) ) {
                require_once $path;
            } else {
                // Log error for missing file using WordPress logging
                if ( function_exists('wp_die') ) {
                    // Only log in debug mode
                    if ( defined('WP_DEBUG') && WP_DEBUG ) {
                        error_log(sprintf('SheetPoet Error: File %s not found', $path));
                    }
                }
            }
        }

        /**
         * Define Plugin Constants.
         * @since 1.0
         */
        private function define_constants() {
            $this->define('SPGS_DEV', false);
            $this->define('SPGS_REST_API_ROUTE', 'spgs/v1');
            $this->define('SPGS_URL', plugin_dir_url(__FILE__));
            $this->define('SPGS_ABSPATH', dirname(__FILE__) . '/');
            $this->define('SPGS_VERSION', $this->get_version());
            $this->define('SPGS_PLUGIN_FILE', __FILE__);
            $this->define('SPGS_PLUGIN_BASENAME', plugin_basename(__FILE__));
        }

        /**
         * Returns Plugin version
         * @since  1.0
         * @return string Plugin version
         */
        public function get_version() {
            return $this->version;
        }

        /**
         * Define constant if not already set.
         *
         * @since  1.0
         * @param  string $name Constant name
         * @param  mixed $value Constant value
         */
        private function define( $name, $value ) {
            if ( ! defined($name) ) {
                define($name, $value);
            }
        }

        /**
         * Get singleton instance
         *
         * @return SPGS_Main
         */
        public static function get_instance() {
            if ( null === self::$instance ) {
                self::$instance = new self();
            }
            return self::$instance;
        }

        public static function utils() {
            return SPGS_Utils::instance();
        }

        public static function function_validator() {
            return SPGS_Function_Validator::instance();
        }

        public static function auth() {
            return SPGS_Auth::instance();
        }

        public static function api() {
            return SPGS_API::instance();
        }

        public static function menu() {
            return SPGS_Menu::instance();
        }

        public static function assets() {
            return SPGS_Assets::instance();
        }

        public static function keys_manager() {
            return SPGS_Keys_Manager::instance();
        }

        public static function settings_model() {
            return SPGS_Settings_Model::instance();
        }

        public static function functions_model() {
            return SPGS_Functions_Model::instance();
        }

        public static function logs_model() {
            return SPGS_Logs_Model::instance();
        }

        public static function keys_model() {
            return SPGS_Keys_Model::instance();
        }

        public static function process_model() {
            return SPGS_Process_Model::instance();
        }
    }

    // Register activation hook
    register_activation_hook(__FILE__, 'spgs_activate');

    // Register deactivation hook
    register_deactivation_hook(__FILE__, 'spgs_deactivate');

    /**
     * Plugin activation function
     */
    function spgs_activate() {
        $utils = SPGS()->utils();
        $utils->create_logs_table();

        // Set default options
        update_option('spgs_version', SPGS()->get_version());

        // Clear permalinks
        flush_rewrite_rules();

        do_action('spgs_activated');
    }

    /**
     * Plugin deactivation function
     */
    function spgs_deactivate() {
        global $wpdb;

        // Clear any scheduled events
        wp_clear_scheduled_hook('spgs_scheduled_tasks');

        // Get plugin settings
        $settings = get_option('spgs_settings', array());

        // Check if we should delete logs
        if ( ! empty($settings['delete_logs_on_deactivation']) ) {
            // Delete logs table data
            $wpdb->query($wpdb->prepare("TRUNCATE TABLE {$wpdb->prefix}spgs_logs"));
        }

        // Check if we should delete tables
        if ( ! empty($settings['delete_tables_on_deactivation']) ) {
            // Drop logs table
            $wpdb->query($wpdb->prepare("DROP TABLE IF EXISTS {$wpdb->prefix}spgs_logs"));
        }

        // Check if we should delete functions data
        if ( ! empty($settings['delete_functions_on_deactivation']) ) {
            // Delete functions data
            delete_option('spgs_functions');
        }

        // Check if we should delete settings and other critical data
        if ( ! empty($settings['delete_settings_on_deactivation']) ) {
            // Delete all plugin options
            delete_option('spgs_settings');
            delete_option('spgs_version');

            // Delete API keys (application passwords) would require more complex code
            // as they are stored in the WordPress user meta table
        }

        // Clear permalinks
        flush_rewrite_rules();

        do_action('spgs_deactivated');
    }

    /**
     * Main plugin function to access singleton instance
     *
     * @return SPGS_Main
     */
    function SPGS() {
        return SPGS_Main::get_instance();
    }

    SPGS();
}
