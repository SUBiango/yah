# Admin Dashboard Logging System

## Overview

The admin dashboard implements a sophisticated logging system with automatic environment detection and log level management to ensure appropriate verbosity in development while surfacing critical errors in production.

## Log Levels

The system supports the following log levels (in order of severity):

1. **`debug`** - Most verbose, shows all logs
2. **`info`** - Informational messages
3. **`warn`** - Warning messages
4. **`error`** - Critical errors (always shown)

## Environment Detection

```javascript
this.isDevEnvironment = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
);
this.logLevel = this.isDevEnvironment ? 'debug' : 'error';
```

### Development Environment
- **Hostname**: `localhost` or `127.0.0.1`
- **Log Level**: `debug`
- **Behavior**: All logs are shown

### Production Environment
- **Hostname**: `www.yahsl.org`
- **Log Level**: `error`
- **Behavior**: Only errors are shown

## Logging Methods

### `log(...args)`
**Purpose**: Debug messages for development troubleshooting  
**Visibility**:
- ✅ Development: Shown
- ❌ Production: Hidden

**Usage**:
```javascript
this.log('Loading participants...');
this.log('API URL:', url);
this.log('Response data:', data);
```

### `logInfo(...args)`
**Purpose**: Informational messages  
**Visibility**:
- ✅ Development: Shown
- ❌ Production: Hidden

**Usage**:
```javascript
this.logInfo('Dashboard initialized successfully');
this.logInfo('User authenticated');
```

### `logWarn(...args)`
**Purpose**: Warning messages that don't block execution  
**Visibility**:
- ✅ Development: Shown
- ❌ Production: Hidden

**Usage**:
```javascript
this.logWarn('Status breakdown not available from backend');
this.logWarn('Retrying failed request');
```

### `logError(...args)` ⚠️
**Purpose**: Critical errors that need attention  
**Visibility**:
- ✅ Development: **ALWAYS SHOWN**
- ✅ Production: **ALWAYS SHOWN**

**Usage**:
```javascript
this.logError('Failed to load dashboard data:', error);
this.logError('API call failed:', { status, message });
this.logError('Participant not found with ID:', participantId);
```

## Implementation Details

```javascript
// Logger wrapper with log levels
log(...args) {
    if (this.logLevel === 'debug') {
        console.log('[Admin]', ...args);
    }
}

logInfo(...args) {
    if (['debug', 'info', 'warn', 'error'].includes(this.logLevel)) {
        console.info('[Admin Info]', ...args);
    }
}

logWarn(...args) {
    if (['debug', 'warn'].includes(this.logLevel)) {
        console.warn('[Admin Warning]', ...args);
    }
}

logError(...args) {
    // ALWAYS log errors regardless of log level
    console.error('[Admin Error]', ...args);
}
```

## Design Rationale

### Why Errors Are Always Shown

1. **Production Debugging**: Critical errors must be visible to diagnose production issues
2. **User Support**: Support teams need error details to help users
3. **Monitoring**: Error tracking tools capture console.error messages
4. **Security**: Errors don't expose sensitive data (properly handled)

### Why Debug Logs Are Hidden in Production

1. **Performance**: Reduces console overhead
2. **Security**: Prevents exposure of internal implementation details
3. **User Experience**: Keeps console clean for actual errors
4. **Compliance**: Follows best practices for production logging

## Best Practices

### ✅ DO

```javascript
// Use logError for all exceptions
try {
    await dangerousOperation();
} catch (error) {
    this.logError('Operation failed:', error);
    this.showAlert('An error occurred', 'error');
}

// Use log for debugging state
this.log('Current page:', this.currentPage);
this.log('Participants loaded:', this.participants.length);

// Use logWarn for non-critical issues
if (!data.statusBreakdown) {
    this.logWarn('Status breakdown not available');
}
```

### ❌ DON'T

```javascript
// Don't use log for errors
this.log('Error occurred:', error); // Wrong! Use logError

// Don't suppress error details
this.logError('Error'); // Wrong! Include context

// Don't log sensitive data
this.log('User password:', password); // NEVER!
```

## Testing

Use `test-logger.html` to verify logging behavior:

1. Open in browser at `http://localhost:5500/test-logger.html`
2. Open browser console (F12)
3. Test each logging method
4. Switch between dev/prod modes
5. Verify errors always appear

## Migration Notes

All existing `console.log`, `console.error`, and `console.warn` calls have been replaced with the wrapper methods:

- `console.log(...)` → `this.log(...)`
- `console.error(...)` → `this.logError(...)`
- `console.warn(...)` → `this.logWarn(...)`

The `this.debug` flag is maintained for backward compatibility.

## Future Enhancements

Consider adding:

1. **Remote Error Reporting**: Send errors to monitoring service
2. **Log Buffering**: Store recent logs for support
3. **User Settings**: Allow admins to toggle log levels
4. **Structured Logging**: Use JSON format for better parsing
5. **Performance Metrics**: Track timing of operations

## Related Files

- **Implementation**: `js/admin.js` (lines 13-50)
- **Test Page**: `test-logger.html`
- **Documentation**: This file
