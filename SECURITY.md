# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Iaruba, please report it responsibly.

**Do NOT open a public issue for security vulnerabilities.**

Instead, please use GitHub's private security advisory workflow:

1. Go to this repository on GitHub.
2. Navigate to the **Security** tab and click **Report a vulnerability**.
3. Include in your report:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - A potential impact assessment
   - Any suggested fixes (if applicable)

### What to Expect

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 1 week
- **Fix timeline:** depends on severity, typically within 2 weeks for critical issues

### Scope

The following are in scope for security reports:

- Serial communication vulnerabilities (e.g., arbitrary command injection via serial)
- Configuration file parsing issues (e.g., YAML deserialization attacks)
- File system access beyond intended scope
- Privilege escalation through the application
- Memory safety issues in FFI bindings

### Out of Scope

- Physical hardware attacks (the Arduino/serial connection is inherently trusted)
- Denial of service through hardware disconnection
- Issues requiring physical access to the machine

## Security Best Practices for Users

1. **Serial permissions:** Only add trusted users to the `dialout` group
2. **Config files:** Store configuration files with appropriate permissions (`chmod 600`)
3. **Updates:** Keep the application and system dependencies updated
