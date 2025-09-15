<?php

/**
 * Settings API Helper for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Settings_Model
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
    private $settings_option_name = 'spgs_settings';

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
     * Get plugin settings
     */
    public function api_get_settings() {
        return new WP_REST_Response($this->get_settings(), 200);
    }

    public function get_public_settings() {
        $settings = $this->get_settings();
        return new WP_REST_Response(array(
            'plugin_enabled' => $settings['plugin_enabled'],
        ), 200);
    }

    public function get_settings() {
        $settings = get_option($this->settings_option_name, array(
            'plugin_enabled'                   => true,
            'delete_logs_on_deactivation'      => false,
            'delete_tables_on_deactivation'    => false,
            'delete_functions_on_deactivation' => false,
            'delete_settings_on_deactivation'  => false,
        ));

        return $settings;
    }

    /**
     * Update plugin settings
     */
    public function set_settings( $request ) {
        $data = $request->get_params();
        $settings = get_option($this->settings_option_name, array());

        // Update only allowed settings
        if ( isset($data['plugin_enabled']) ) {
            $settings['plugin_enabled'] = (bool) $data['plugin_enabled'];
        }

        // Update deactivation settings
        if ( isset($data['delete_logs_on_deactivation']) ) {
            $settings['delete_logs_on_deactivation'] = (bool) $data['delete_logs_on_deactivation'];
        }

        if ( isset($data['delete_tables_on_deactivation']) ) {
            $settings['delete_tables_on_deactivation'] = (bool) $data['delete_tables_on_deactivation'];
        }

        if ( isset($data['delete_functions_on_deactivation']) ) {
            $settings['delete_functions_on_deactivation'] = (bool) $data['delete_functions_on_deactivation'];
        }

        if ( isset($data['delete_settings_on_deactivation']) ) {
            $settings['delete_settings_on_deactivation'] = (bool) $data['delete_settings_on_deactivation'];
        }

        update_option($this->settings_option_name, $settings);

        return new WP_REST_Response($settings, 200);
    }


    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Settings_Model is not allowed.');
    }
}
