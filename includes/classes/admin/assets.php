<?php

/**
 * Handle backend scripts for SheetPoet
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Assets
{
    public function __construct() {
        add_action('admin_enqueue_scripts', array( __CLASS__, 'admin_enqueue_scripts' ), 10, 1);
    }

    public static function instance() {
        static $instance = null;

        if ( null === $instance ) {
            $instance = new self();
        }

        return $instance;
    }

    /**
     * Enqueue Backend Scripts
     *
     * @since 1.0.0
     */
    public static function admin_enqueue_scripts() {
        $currentScreen = get_current_screen();
        $screenID = $currentScreen->id;

        if ( $screenID === "toplevel_page_spgs" ) {
            $apiNonce = wp_create_nonce('wp_rest');
            $root = rest_url(SPGS_REST_API_ROUTE . '/');
            $baseUrl = SPGS_URL;

            if ( defined('SPGS_DEV') && SPGS_DEV ) {
                if ( class_exists('SPGS_Assets_Dev') ) {
                    SPGS_Assets_Dev::enqueue_dev_assets($apiNonce, $root, $baseUrl);
                }
            } else {
                wp_enqueue_script(
                    'spgs-backend',
                    SPGS_URL . 'includes/admin/assets/js/index.js',
                    array( 'wp-i18n' ),
                    SPGS_VERSION,
                    true
                );
                wp_localize_script(
                    'spgs-backend',
                    'spgs',
                    array(
                        'apiNonce' => $apiNonce,
                        'root'     => $root,
                        'baseUrl'  => $baseUrl,
                    )
                );
            }
        }
    }
}
