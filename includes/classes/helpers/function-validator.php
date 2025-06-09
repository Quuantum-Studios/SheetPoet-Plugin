<?php

/**
 * Function Validator for SheetPoet
 *
 * Validates user-defined PHP functions for security and correctness
 *
 * @since     1.0.0
 */

defined('ABSPATH') || exit;

class SPGS_Function_Validator
{
    /**
     * Class instance
     *
     * @var    self
     * @access private
     * @since  1.0.0
     */
    private static $instance = null;

    /**
     * Blacklisted PHP functions and language constructs
     *
     * @var array
     */
    private $dangerous_functions = [
        // System execution
        'exec',
        'passthru',
        'shell_exec',
        'system',
        'proc_open',
        'popen',
        'pcntl_exec',
        // Code execution
        'eval',
        'assert',
        'create_function',
        'call_user_func',
        'call_user_func_array',
        'preg_replace', // Can be dangerous with /e modifier
        // File operations that could be dangerous
        'include',
        'include_once',
        'require',
        'require_once',
        // Dynamic loading
        'dl',
        // File system operations
        'file_put_contents',
        'file_get_contents',
        'unlink',
        'fopen',
        'file',
        'rename',
        'copy',
        'unlink',
        'rmdir',
        'mkdir',
        'chmod',
        'chown',
        'touch',
        // Database direct access
        'mysql_query',
        'mysqli_query',
        'pg_query',
        'sqlite_query',
        'PDO',
        // WordPress database direct access
        'query',
        'get_results',
        'get_row',
        'get_col',
        'get_var',
        'prepare',
        // Potentially dangerous WordPress functions
        'wp_remote_request',
        'wp_remote_get',
        'wp_remote_post',
        'wp_remote_head',
        // Network operations
        'curl_exec',
        'curl_init',
        'fsockopen',
        'socket_create',
        // Other dangerous constructs
        'base64_decode',
        'gzinflate',
        'gzuncompress',
        'gzdecode',
        'str_rot13',
    ];

    /**
     * PHP reserved words list
     *
     * @var array
     */
    private $reserved_words = [
        'abstract',
        'and',
        'array',
        'as',
        'break',
        'callable',
        'case',
        'catch',
        'class',
        'clone',
        'const',
        'continue',
        'declare',
        'default',
        'die',
        'do',
        'echo',
        'else',
        'elseif',
        'empty',
        'enddeclare',
        'endfor',
        'endforeach',
        'endif',
        'endswitch',
        'endwhile',
        'extends',
        'final',
        'finally',
        'fn',
        'for',
        'foreach',
        'function',
        'global',
        'goto',
        'if',
        'implements',
        'include',
        'include_once',
        'instanceof',
        'insteadof',
        'interface',
        'isset',
        'list',
        'match',
        'namespace',
        'new',
        'or',
        'print',
        'private',
        'protected',
        'public',
        'require',
        'require_once',
        'return',
        'static',
        'switch',
        'throw',
        'trait',
        'try',
        'unset',
        'use',
        'var',
        'while',
        'xor',
        'yield',
        'int',
        'float',
        'bool',
        'string',
        'true',
        'false',
        'null',
        '__CLASS__',
        '__DIR__',
        '__FILE__',
        '__FUNCTION__',
        '__LINE__',
        '__METHOD__',
        '__NAMESPACE__',
        '__TRAIT__',
    ];

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {}

    /**
     * Ensures only one instance is loaded or can be loaded.
     *
     * @since 1.0.0
     * @return self
     */
    public static function instance() {
        if ( is_null(self::$instance) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Validate function code
     *
     * @param string      $name       The function name
     * @param string      $code       The function code
     * @return array Validation result with 'valid' boolean and 'message' string
     */
    public function validate_function_code( $name, $code ) {
        do_action('spgs_before_function_validation', $name, $code);

        $name = trim($name);
        $code = trim($code);

        $name = apply_filters('spgs_function_name_before_validation', $name);
        $code = apply_filters('spgs_function_code_before_validation', $code, $name);
        if ( empty($name) ) {
            return $this->create_result(false, 'Function name cannot be empty.');
        }

        if ( empty($code) ) {
            return $this->create_result(false, 'Function code cannot be empty.');
        }

        // Check function name syntax
        if ( ! preg_match('/^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*$/', $name) ) {
            return $this->create_result(
                false,
                'Invalid function name. Function names must start with a letter or underscore, ' .
                    'followed by any number of letters, numbers, or underscores.'
            );
        }

        // Check if function name is a PHP reserved word
        if ( in_array(strtolower($name), $this->reserved_words, true) ) {
            return $this->create_result(
                false,
                "'{$name}' is a PHP reserved word and cannot be used as a function name."
            );
        }

        // Check if function name exists as a WordPress or PHP built-in function
        if ( function_exists($name) ) {
            return $this->create_result(
                false,
                "Function name '{$name}' conflicts with an existing PHP or WordPress function."
            );
        }

        // Check for dangerous code
        $dangerous_check = $this->check_for_dangerous_code($code);
        if ( ! $dangerous_check['valid'] ) {
            return $dangerous_check;
        }

        // Check if function declaration exists with correct name
        if ( ! preg_match('/function\s+' . preg_quote($name, '/') . '\s*\(/i', $code) ) {
            return $this->create_result(
                false,
                "Function '{$name}' declaration not found in code. " .
                    "Make sure the function name in your code matches '{$name}'."
            );
        }

        // Check if function accepts $record parameter
        if ( ! preg_match('/function\s+' . preg_quote($name, '/') . '\s*\(\s*\$record\b/i', $code) ) {
            return $this->create_result(
                false,
                "Function must accept a \$record parameter as the first argument."
            );
        }

        // Check if function has a return statement
        if ( ! preg_match('/\breturn\b\s*[^;]*;/i', $code) ) {
            return $this->create_result(
                false,
                "Function must include at least one return statement."
            );
        }

        // Check PHP syntax
        $syntax_check = $this->check_php_syntax($code);
        if ( ! $syntax_check['valid'] ) {
            return $syntax_check;
        }

        $result = $this->create_result(true, 'Function code is valid.');
        do_action('spgs_after_function_validation', $name, $code, $result);
        return $result;
    }

    /**
     * Create a standardized validation result
     *
     * @param bool   $valid   Whether validation passed
     * @param string $message The validation message
     * @return array Validation result
     */
    private function create_result( $valid, $message ) {
        return [
            'valid'   => (bool) $valid,
            'message' => $message,
        ];
    }

    /**
     * Check for dangerous code using token-based analysis
     *
     * @param string $code The PHP code to check
     * @return array Validation result
     */
    private function check_for_dangerous_code( $code ) {
        if ( preg_match('/\$\$[a-zA-Z_\x7f-\xff]/i', $code) ) {
            return $this->create_result(false, "Variable variables ($$var) are not allowed for security reasons.");
        }

        if ( preg_match('/<\?(?!php)/i', $code) ) {
            return $this->create_result(false, "PHP short tags (<?) are not allowed. Use <?php instead.");
        }

        if ( preg_match('/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\(/i', $code) ) {
            return $this->create_result(false, "Dynamic function calls using variables are not allowed.");
        }
        foreach ( $this->dangerous_functions as $func ) {
            if ( preg_match('/\b' . preg_quote($func, '/') . '\s*\(/i', $code) ) {
                return $this->create_result(false, "Dangerous function '{$func}' detected in code.");
            }

            if ( preg_match('/function_exists\s*\(\s*[\'"]' . preg_quote($func, '/') . '[\'"]/', $code) ) {
                return $this->create_result(false, "Attempting to check for dangerous function '{$func}' is not allowed.");
            }
        }
        if ( function_exists('token_get_all') ) {
            try {
                $tokens = @token_get_all('<?php ' . $code . ' ?>');
                $dangerous_token_check = $this->analyze_tokens_for_dangerous_code($tokens);
                if ( $dangerous_token_check && ! $dangerous_token_check['valid'] ) {
                    return $dangerous_token_check;
                }
            } catch ( \Throwable $e ) {
                // If token_get_all fails, fall back to our regex check which already passed
            }
        }

        if ( preg_match('/\$wpdb\s*->/i', $code) ) {
            return $this->create_result(false, "Direct database access using \$wpdb is not allowed.");
        }

        if ( preg_match('/`[^`]*`/', $code) ) {
            return $this->create_result(false, "Backtick operators (`) for shell execution are not allowed.");
        }

        if ( preg_match('/\bunserialize\s*\(/i', $code) ) {
            return $this->create_result(false, "The unserialize() function is not allowed for security reasons.");
        }

        if ( preg_match('/\bReflection|\bReflectionClass|\bReflectionFunction|\bReflectionMethod|\bReflectionProperty/i', $code) ) {
            return $this->create_result(false, "Reflection classes and methods are not allowed for security reasons.");
        }

        return $this->create_result(true, 'No dangerous code detected.');
    }

    /**
     * Analyze tokens for dangerous patterns
     *
     * @param array $tokens The PHP tokens to analyze
     * @return array|null Validation result or null if no issues found
     */
    private function analyze_tokens_for_dangerous_code( $tokens ) {
        if ( ! is_array($tokens) ) {
            return null;
        }

        $count = count($tokens);

        for ( $i = 0; $i < $count; $i++ ) {
            $token = $tokens[ $i ];

            if ( is_array($token) && $token[0] === T_STRING ) {
                $function_name = strtolower($token[1]);

                if ( in_array($function_name, array_map('strtolower', $this->dangerous_functions)) ) {
                    $next_key = $i + 1;
                    while ( $next_key < $count ) {
                        $next_token = $tokens[ $next_key ];

                        if ( is_array($next_token) && $next_token[0] === T_WHITESPACE ) {
                            $next_key++;
                            continue;
                        }

                        if ( ! is_array($next_token) && $next_token === '(' ) {
                            return $this->create_result(false, "Dangerous function '{$function_name}' detected in code.");
                        }

                        break;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract function name from code
     *
     * @param string $code The PHP code
     * @return string|null The function name or null if not found
     */
    private function get_function_name_from_code( $code ) {
        // Use regex to extract the function name
        if ( preg_match('/function\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\(/i', $code, $matches) ) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Check PHP syntax without using eval
     *
     * @param string $code The PHP code to check
     * @return array Validation result
     */
    private function check_php_syntax( $code ) {
        if ( $this->check_php_syntax_with_parser($code, $result) ) {
            return $result;
        }

        if ( $this->check_php_syntax_with_temp_file($code, $result) ) {
            return $result;
        }
        return $this->check_php_syntax_with_tokens($code);
    }

    /**
     * Check PHP syntax using PHP-Parser library
     *
     * @param string $code The PHP code to check
     * @param array &$result The validation result (populated on success)
     * @return bool Whether the method was successful
     */
    private function check_php_syntax_with_parser( $code, &$result ) {
        // Load PHP Parser if available
        $composer_autoload = dirname(__DIR__) . '/vendor/autoload.php';
        if ( file_exists($composer_autoload) ) {
            require_once $composer_autoload;
        }

        if ( class_exists('PhpParser\Parser') && class_exists('PhpParser\Error') && class_exists('PhpParser\ParserFactory') ) {
            try {
                // Create a parser instance
                $parserFactory = new \PhpParser\ParserFactory();

                if ( method_exists($parserFactory, 'create') ) {
                    $parser = $parserFactory->create(\PhpParser\ParserFactory::PREFER_PHP7);
                    $ast = $parser->parse("<?php\n" . $code);

                    // Check if the function is actually defined in the code
                    $function_found = false;
                    $function_name = $this->get_function_name_from_code($code);

                    // Create a node visitor to find the function
                    if ( class_exists('PhpParser\NodeVisitorAbstract') && class_exists('PhpParser\NodeTraverser') ) {
                        $traverser = new \PhpParser\NodeTraverser();
                        $visitor = new class($function_name) extends \PhpParser\NodeVisitorAbstract {
                            private $function_name;
                            private $found = false;

                            public function __construct( $function_name ) {
                                $this->function_name = $function_name;
                            }

                            public function enterNode( \PhpParser\Node $node ) {
                                if ( $node instanceof \PhpParser\Node\Stmt\Function_ ) {
                                    if ( $node->name->toString() === $this->function_name ) {
                                        $this->found = true;
                                    }
                                }
                            }

                            public function isFound() {
                                return $this->found;
                            }
                        };

                        $traverser->addVisitor($visitor);
                        $traverser->traverse($ast);

                        $function_found = $visitor->isFound();

                        if ( ! $function_found && $function_name ) {
                            $result = $this->create_result(
                                false,
                                "Function declaration for '{$function_name}' not found in code. " .
                                    "Make sure your function is properly defined."
                            );
                            return true;
                        }
                    }

                    $result = $this->create_result(true, 'PHP syntax is valid (parsed with PHP-Parser).');
                    return true;
                }
            } catch ( \PhpParser\Error $e ) {
                $result = $this->create_result(false, 'PHP Syntax Error: ' . $e->getMessage());
                return true;
            } catch ( \Exception $e ) {
                // Continue to next method if PHP-Parser throws any other exception
            }
        }

        return false;
    }

    /**
     * Check PHP syntax using a temporary file and PHP's lint mode
     *
     * @param string $code The PHP code to check
     * @param array &$result The validation result (populated on success)
     * @return bool Whether the method was successful
     */
    private function check_php_syntax_with_temp_file( $code, &$result ) {
        try {
            // Create a temporary file with a unique name
            $temp_file = $this->create_temp_file();

            if ( ! $temp_file ) {
                // Skip to fallback method
                return false;
            }

            // Write the code to the temp file, wrapping it in a namespace to avoid conflicts
            $namespace = 'SPGS_Validator_' . md5(uniqid('', true));
            $full_code = "<?php\nnamespace {$namespace};\n{$code}\n?>";

            if ( false === file_put_contents($temp_file, $full_code) ) {
                // Clean up and skip to fallback method
                $this->safely_delete_file($temp_file);
                return false;
            }

            // List of possible PHP binary paths to try
            $php_executables = [
                'php',                  // Standard PATH lookup
                '/usr/bin/php',         // Common Linux/Unix path
                '/usr/local/bin/php',   // Common alternate path
                '/opt/php/bin/php',     // Another possible location
                PHP_BINARY,             // PHP constant, if available
            ];

            // Remove duplicates
            $php_executables = array_unique(array_filter($php_executables));

            $valid_syntax_check = false;
            $last_output = '';
            $last_return_var = 0;

            // Try each PHP executable until we find one that works for syntax checking
            foreach ( $php_executables as $php_executable ) {
                // Skip if empty
                if ( empty($php_executable) ) {
                    continue;
                }

                $output = [];
                $return_var = 0;

                // Execute PHP in lint mode
                $command = escapeshellcmd($php_executable) . ' -l ' . escapeshellarg($temp_file) . ' 2>&1';

                // Use exec if available and allowed
                if ( function_exists('exec') && ! in_array('exec', explode(',', ini_get('disable_functions')), true) ) {
                    exec($command, $output, $return_var);
                    $output_str = implode("\n", $output);

                    // Store last output and return var for possible error message
                    $last_output = $output_str;
                    $last_return_var = $return_var;

                    // Check if this is a PHP-FPM binary instead of CLI
                    // If output contains php-fpm usage info, this is the wrong binary
                    if (
                        strpos($output_str, 'php-fpm') !== false &&
                        strpos($output_str, 'Usage:') !== false &&
                        strpos($output_str, '-t') !== false
                    ) {
                        // This is php-fpm, not php-cli - skip to next binary
                        continue;
                    }

                    // Check if syntax check was successful
                    if ( strpos($output_str, 'No syntax errors') !== false ) {
                        // Clean up the temporary file
                        $this->safely_delete_file($temp_file);
                        $result = $this->create_result(true, 'PHP syntax is valid.');
                        return true;
                    }

                    // If we have a specific syntax error (not just general failure)
                    if ( $return_var !== 0 && strpos($output_str, 'Parse error:') !== false ) {
                        // Extract the actual syntax error from the output
                        $error_message = $output_str;

                        // Try to extract the specific error message
                        if ( preg_match('/Parse error:\s*(.+?)\s*in\s*.+?\s*on\s*line\s*\d+/', $output_str, $matches) ) {
                            $error_message = $matches[1];
                        }

                        // Clean up the temporary file
                        $this->safely_delete_file($temp_file);

                        $result = $this->create_result(false, 'PHP Syntax Error: ' . $error_message);
                        return true;
                    }
                }
            }

            // If we get here, none of the PHP executables worked properly for syntax checking
            // Clean up the temporary file
            $this->safely_delete_file($temp_file);

            // If the last execution had a legitimate error, return it
            if ( $last_return_var !== 0 && ! empty($last_output) ) {
                $error_message = 'Unknown syntax error';

                // Try to extract a specific error message
                if ( preg_match('/Parse error:\s*(.+?)\s*in\s*.+?\s*on\s*line\s*\d+/', $last_output, $matches) ) {
                    $error_message = $matches[1];
                }

                $result = $this->create_result(false, 'PHP Syntax Error: ' . $error_message);
                return true;
            }

            // No valid PHP binary was found for syntax checking
            return false;
        } catch ( \Throwable $e ) {
            // Continue to next method if an exception occurs
            return false;
        }
    }

    /**
     * Create a temporary file for syntax checking
     *
     * @return string|false Path to the temporary file or false on failure
     */
    private function create_temp_file() {
        $prefix = 'spgs-syntax-check-' . md5(uniqid('', true)) . '.php';

        if ( function_exists('wp_tempnam') ) {
            return wp_tempnam($prefix);
        }

        if ( function_exists('tempnam') ) {
            return @tempnam(sys_get_temp_dir(), $prefix);
        }

        return false;
    }

    /**
     * Check PHP syntax using token analysis
     *
     * @param string $code The PHP code to check
     * @return array Validation result
     */
    private function check_php_syntax_with_tokens( $code ) {
        try {
            if ( ! function_exists('token_get_all') ) {
                return $this->create_result(
                    true,
                    'PHP syntax check skipped due to token_get_all function not being available.'
                );
            }

            $tokens = @token_get_all('<?php ' . $code . ' ?>');

            if ( ! is_array($tokens) ) {
                return $this->create_result(
                    false,
                    'PHP Syntax Error: Unable to tokenize code.'
                );
            }

            $braces = 0;
            $parentheses = 0;
            $brackets = 0;
            $has_function = false;
            $has_return = false;

            foreach ( $tokens as $token ) {
                if ( ! is_array($token) ) {
                    switch ( $token ) {
                        case '{':
                            $braces++;
                            break;
                        case '}':
                            $braces--;
                            break;
                        case '(':
                            $parentheses++;
                            break;
                        case ')':
                            $parentheses--;
                            break;
                        case '[':
                            $brackets++;
                            break;
                        case ']':
                            $brackets--;
                            break;
                    }
                } else {
                    list($token_id, $token_text) = $token;

                    if ( $token_id === T_FUNCTION ) {
                        $has_function = true;
                    }

                    if ( $token_id === T_RETURN ) {
                        $has_return = true;
                    }
                }

                if ( $braces < 0 || $parentheses < 0 || $brackets < 0 ) {
                    return $this->create_result(
                        false,
                        'PHP Syntax Error: Unexpected closing brace, parenthesis, or bracket.'
                    );
                }
            }

            if ( $braces !== 0 || $parentheses !== 0 || $brackets !== 0 ) {
                $message = '';
                if ($braces !== 0) $message .= 'Unbalanced curly braces. ';
                if ($parentheses !== 0) $message .= 'Unbalanced parentheses. ';
                if ($brackets !== 0) $message .= 'Unbalanced brackets. ';

                return $this->create_result(false, 'PHP Syntax Error: ' . $message);
            }

            if ( ! $has_function ) {
                return $this->create_result(false, 'PHP Syntax Error: No function declaration found.');
            }

            if ( ! $has_return ) {
                return $this->create_result(false, 'PHP Syntax Error: No return statement found.');
            }

            return $this->create_result(
                true,
                'PHP syntax appears valid (based on limited token analysis).'
            );
        } catch ( \Throwable $e ) {
            return $this->create_result(
                true,
                'PHP syntax check skipped due to environment limitations.'
            );
        }
    }

    /**
     * Safely delete a file using WordPress functions if available
     *
     * @param string $file_path Path to the file to delete
     * @return bool Whether the file was deleted
     */
    private function safely_delete_file( $file_path ) {
        if ( empty($file_path) || ! file_exists($file_path) ) {
            return false;
        }

        // Use WordPress function if available
        if ( function_exists('wp_delete_file') ) {
            return wp_delete_file($file_path);
        }

        // Fallback to PHP's unlink with error suppression
        return @unlink($file_path);
    }

    /**
     * Prevent cloning of the instance
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __clone() {
        throw new \Error('Cloning SPGS_Function_Validator is not allowed.');
    }

    /**
     * Prevent unserializing of the instance
     *
     * @since 1.0.0
     * @throws \Error
     */
    public function __wakeup() {
        throw new \Error('Unserializing SPGS_Function_Validator is not allowed.');
    }
}
