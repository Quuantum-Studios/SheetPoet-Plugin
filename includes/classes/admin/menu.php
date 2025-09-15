<?php

/**
 * Setup Menu Pages for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Menu
{
    public function __construct() {
        // Add submenu items
        add_action('admin_menu', array( $this, 'register_menu' ));
        // Add links under plugin page.
        add_filter('plugin_action_links_spgs/spgs.php', array( $this, 'add_settings_link' ));
        add_filter('plugin_action_links_spgs/spgs.php', array( $this, 'docs_link' ));
    }

    public static function instance() {
        static $instance = null;

        if ( null === $instance ) {
            $instance = new self();
        }

        return $instance;
    }

    /**
     * Define Menu
     *
     * @since 1.0.0
     */
    public function register_menu() {
        add_menu_page(
            __('SheetPoet – Spreadsheet Connector', 'sheetpoet'),
            __('SheetPoet', 'sheetpoet'),
            'manage_options',
            'spgs',
            array( $this, 'display_react_admin_page' ),
            SPGS_URL . 'includes/admin/assets/images/icon.png'
        );
    }

    /**
     * Init the view part.
     *
     * @since 1.0.0
     */
    public function display_react_admin_page() {
        echo "<div id='root'></div>";
    }

    /**
     * Plugin Settings Link on plugin page
     *
     * @since         1.0.0
     */
    function add_settings_link( $links ) {
        $settings = array(
            '<a href="' . admin_url('admin.php?page=spgs') . '">Settings</a>',
        );
        return array_merge($links, $settings);
    }

    /**
     * Plugin Documentation Link on plugin page
     *
     * @since         1.0.0
     */
    function docs_link( $links ) {
        $docs = array(
            '<a target="_blank" href="https://quuantum.com/sheetpoet/docs">Documentation</a>',
        );
        return array_merge($links, $docs);
    }
}