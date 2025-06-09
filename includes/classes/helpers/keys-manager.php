<?php

/**
 * API Keys Manager for SheetPoet
 *
 * A class to handle CRUD operations for WordPress Application Passwords.
 *
 * @package     SheetPoet
 * @version     1.0.1
 */

defined('ABSPATH') || exit;

class SPGS_Keys_Manager
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
    private $app_name_prefix = 'SheetPoet';

    /**
     * Constructor
     */
    public function __construct() {
        // Initialize any required properties or hooks
    }

    /**
     * Ensures only one instance is loaded or can be loaded.
     *
     * @since 1.0.0
     * @return SPGS_Keys_Manager
     */
    public static function instance() {
        if ( is_null(self::$_instance) ) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Get all API keys (Application Passwords)
     *
     * @return array Array of API keys
     */
    public function get_all() {
        $current_user_id = $this->get_admin_user_id();
        if ( ! $current_user_id ) {
            return array();
        }

        $app_passwords = $this->get_all_application_passwords($current_user_id);

        if ( is_wp_error($app_passwords) || empty($app_passwords['passwords']) ) {
            return array();
        }

        $formatted_passwords = array();
        foreach ( $app_passwords['passwords'] as $password ) {
            if ( strpos($password['name'], $this->app_name_prefix) === 0 ) {
                $formatted_passwords[] = array(
                    'id'      => $password['uuid'],
                    'name'    => str_replace($this->app_name_prefix . ': ', '', $password['name']),
                    'created' => wp_date('Y-m-d H:i:s', $password['created']),
                );
            }
        }

        return $formatted_passwords;
    }

    /**
     * Get an admin user ID
     *
     * @return int|false User ID or false if no admin found
     */
    private function get_admin_user_id() {
        if ( is_user_logged_in() && current_user_can('manage_options') ) {
            return get_current_user_id();
        }
        return false;
    }

    /**
     * Get a specific API key by ID (UUID)
     *
     * @param string $id The API key ID (UUID)
     * @return array|false API key data or false if not found
     */
    public function get( $id ) {
        $current_user_id = $this->get_admin_user_id();
        if ( ! $current_user_id ) {
            return false;
        }

        $app_password = $this->get_application_password($current_user_id, $id);

        if ( is_wp_error($app_password) || empty($app_password['password']) ) {
            return false;
        }

        $password = $app_password['password'];

        return array(
            'id'      => $password['uuid'],
            'name'    => str_replace($this->app_name_prefix . ': ', '', $password['name']),
            'created' => wp_date('Y-m-d H:i:s', $password['created']),
        );
    }

    /**
     * Create a new API key (Application Password)
     *
     * @param string $name The name of the API key
     * @return array|WP_Error The newly created API key data or error object
     */
    public function create( $name ) {
        $current_user_id = $this->get_admin_user_id();
        if ( ! $current_user_id ) {
            return new WP_Error('no_user', __('No administrator user found.', 'sheetpoet'));
        }

        // Ensure we have a valid name
        if ( empty($name) ) {
            $name = 'API Key ' . current_time('Y-m-d H:i:s');
        } else {
            $name = sanitize_text_field($name);
        }

        // Create the application name with our prefix
        $app_name = $this->app_name_prefix . ': ' . $name;

        // Create the application password
        $created = $this->create_application_password($current_user_id, $app_name);

        if ( is_wp_error($created) ) {
            return $created;
        }

        return array(
            'id'      => $created['item']['uuid'],
            'name'    => str_replace($this->app_name_prefix . ': ', '', $created['item']['name']),
            'key'     => $created['password'],
            'created' => wp_date('Y-m-d H:i:s', $created['item']['created']),
        );
    }

    /**
     * Delete an API key (Application Password)
     *
     * @param string $id The API key ID (UUID)
     * @return bool Whether the API key was deleted
     */
    public function delete( $id ) {
        $current_user_id = $this->get_admin_user_id();
        if ( ! $current_user_id ) {
            return false;
        }

        $result = $this->delete_application_password($current_user_id, $id);

        return ! is_wp_error($result) && ! empty($result['success']);
    }

    /**
     * Create a new application password for a user
     *
     * @param int    $user_id    The WordPress user ID
     * @param string $app_name   The name of the application
     * @param array  $args       Optional arguments
     *
     * @return array|WP_Error Array containing the password details or WP_Error on failure
     */
    public function create_application_password( $user_id, $app_name, $args = array() ) {
        // Verify the user exists
        $user = get_userdata($user_id);
        if ( ! $user ) {
            return new WP_Error(
                'invalid_user',
                __('The specified user does not exist.', 'sheetpoet')
            );
        }

        // Ensure we have a valid application name
        if ( empty($app_name) ) {
            $app_name = $this->app_name_prefix . ': ' . current_time('Y-m-d H:i:s');
        }

        $args = array_merge(array(
            'name' => $app_name,
        ), $args);

        // Create the application password
        $created = WP_Application_Passwords::create_new_application_password($user_id, $args);

        if ( is_wp_error($created) ) {
            return $created;
        }

        // Return the password details
        return array(
            'password'   => $created[0], // The unhashed password (only available at creation time)
            'item'       => $created[1], // The password item details
            'success'    => true,
            'app_name'   => $app_name,
            'user_id'    => $user_id,
            'user_login' => $user->user_login,
        );
    }

    /**
     * Get all application passwords for a user
     *
     * @param int $user_id The WordPress user ID
     *
     * @return array|WP_Error Array of application passwords or WP_Error on failure
     */
    public function get_all_application_passwords( $user_id ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return new WP_Error(
                'invalid_user',
                __('The specified user does not exist.', 'sheetpoet')
            );
        }

        // Get all application passwords for the user
        $passwords = WP_Application_Passwords::get_user_application_passwords($user_id);

        return array(
            'passwords' => $passwords ? $passwords : array(),
            'user_id'   => $user_id,
            'count'     => $passwords ? count($passwords) : 0,
        );
    }

    /**
     * Get a specific application password by UUID
     *
     * @param int    $user_id The WordPress user ID
     * @param string $uuid    The UUID of the application password
     *
     * @return array|WP_Error Password details or WP_Error on failure
     */
    public function get_application_password( $user_id, $uuid ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return new WP_Error(
                'invalid_user',
                __('The specified user does not exist.', 'sheetpoet')
            );
        }

        // Get all application passwords for the user
        $passwords = WP_Application_Passwords::get_user_application_passwords($user_id);

        if ( empty($passwords) ) {
            return new WP_Error(
                'no_passwords',
                __('No application passwords found for this user.', 'sheetpoet')
            );
        }

        // Find the password with the matching UUID
        foreach ( $passwords as $password ) {
            if ( $password['uuid'] === $uuid ) {
                return array(
                    'password' => $password,
                    'user_id'  => $user_id,
                    'success'  => true,
                );
            }
        }

        return new WP_Error(
            'password_not_found',
            __('The specified application password was not found.', 'sheetpoet')
        );
    }

    /**
     * Delete an application password
     *
     * @param int    $user_id The WordPress user ID
     * @param string $uuid    The UUID of the application password
     *
     * @return array|WP_Error Result of the deletion operation
     */
    public function delete_application_password( $user_id, $uuid ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return new WP_Error(
                'invalid_user',
                __('The specified user does not exist.', 'sheetpoet')
            );
        }

        // Delete the application password
        $deleted = WP_Application_Passwords::delete_application_password($user_id, $uuid);

        if ( ! $deleted ) {
            return new WP_Error(
                'password_not_found',
                __('The specified application password was not found or could not be deleted.', 'sheetpoet')
            );
        }

        return array(
            'success' => true,
            'user_id' => $user_id,
            'uuid'    => $uuid,
            'message' => __('Application password successfully deleted.', 'sheetpoet'),
        );
    }

    /**
     * Delete all application passwords for a user
     *
     * @param int $user_id The WordPress user ID
     *
     * @return array|WP_Error Result of the deletion operation
     */
    public function delete_all_application_passwords( $user_id ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return new WP_Error(
                'invalid_user',
                __('The specified user does not exist.', 'sheetpoet')
            );
        }

        // Delete all application passwords
        $deleted = WP_Application_Passwords::delete_all_application_passwords($user_id);

        if ( ! $deleted ) {
            return new WP_Error(
                'delete_failed',
                __('Failed to delete application passwords.', 'sheetpoet')
            );
        }

        return array(
            'success' => true,
            'user_id' => $user_id,
            'message' => __('All application passwords successfully deleted.', 'sheetpoet'),
        );
    }

    /**
     * Check if a user has any application passwords
     *
     * @param int $user_id The WordPress user ID
     *
     * @return bool Whether the user has any application passwords
     */
    public function user_has_application_passwords( $user_id ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return false;
        }

        return WP_Application_Passwords::has_application_passwords($user_id);
    }

    /**
     * Check if application passwords are enabled for a user
     *
     * @param int $user_id The WordPress user ID
     *
     * @return bool Whether application passwords are enabled for the user
     */
    public function is_application_passwords_enabled_for_user( $user_id ) {
        // Verify the user exists
        if ( ! get_userdata($user_id) ) {
            return false;
        }

        return WP_Application_Passwords::is_enabled_for_user($user_id);
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.0
     */
    public function __clone() {
        _doing_it_wrong(__FUNCTION__, esc_html__('Cheatin&#8217; huh?', 'sheetpoet'), esc_html(SPGS_VERSION));
    }

    /**
     * Unserializing instances of this class is forbidden.
     *
     * @since 1.0.0
     */
    public function __wakeup() {
        _doing_it_wrong(__FUNCTION__, esc_html__('Cheatin&#8217; huh?', 'sheetpoet'), esc_html(SPGS_VERSION));
    }
}
