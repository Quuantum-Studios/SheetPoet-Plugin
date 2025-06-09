<?php

/**
 * Utility functions for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Utils
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
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->logs_table_name = $wpdb->prefix . 'spgs_logs';
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
     * Create logs table if it doesn't exist
     */
    public function create_logs_table() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$this->logs_table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            task_id varchar(255) NOT NULL,
            function_name varchar(255),
            function_label varchar(255),
            function_type varchar(255),
            status varchar(255),
            request_data longtext,
            response_data longtext,
            meta_data longtext,
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Utils is not allowed.');
    }

    /**
     * Prevent unserializing of the instance
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __wakeup() {
        throw new \Error('Unserializing SPGS_Utils is not allowed.');
    }
}
