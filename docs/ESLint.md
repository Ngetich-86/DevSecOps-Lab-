# ESLint Configuration Guide

This guide provides comprehensive documentation for ESLint setup and usage in the DevSecOps TaskManager project.

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Rules and Standards](#rules-and-standards)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This project uses ESLint v9 with TypeScript support to maintain code quality, consistency, and catch potential errors early in the development process.

### Key Features
- **TypeScript Support**: Full TypeScript parsing and linting
- **Modern Configuration**: ESLint v9 flat config format
- **Automatic Fixing**: Many issues can be automatically resolved
- **Development-Friendly**: Configured for development workflow
- **CI/CD Integration**: Works with Jenkins and other CI tools

## Installation

### Dependencies
The following packages are required for ESLint to work with TypeScript:

```json
{
  "devDependencies": {
    "eslint": "^9.35.0",
    "@typescript-eslint/parser": "^8.42.0",
    "@typescript-eslint/eslint-plugin": "^8.42.0"
  }
}
```

### Install Dependencies
```bash
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## Configuration

### Configuration File: `eslint.config.js`

The project uses ESLint v9's flat configuration format:

```javascript
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-var-requires': 'error',
      
      // General rules
      'no-console': 'off', // Allow console statements in development
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Turn off base rule as it conflicts with TypeScript version
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always'
      }],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'off', // Allow console statements in development
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'drizzle/migrations/**',
      'grafana/**',
    ],
  },
];
```

### Configuration Breakdown

#### TypeScript Files (`**/*.ts`, `**/*.tsx`)
- **Parser**: TypeScript parser for proper AST analysis
- **Project**: References `tsconfig.json` for type checking
- **Plugins**: TypeScript-specific linting rules

#### JavaScript Files (`**/*.js`, `**/*.mjs`)
- **Parser**: Standard JavaScript parser
- **Rules**: Basic JavaScript linting rules

#### Ignored Files
- `node_modules/`: Third-party dependencies
- `dist/`, `build/`: Compiled output
- `coverage/`: Test coverage reports
- `drizzle/migrations/`: Database migration files
- `grafana/`: Monitoring configuration files

## Usage

### Available Scripts

```bash
# Check for linting issues
pnpm run lint

# Automatically fix fixable issues
pnpm run lint:fix

# Lint specific files
npx eslint src/server.ts

# Lint with specific options
npx eslint . --ext .ts,.tsx
```

### Command Line Options

```bash
# Fix automatically fixable issues
eslint . --fix

# Output in JSON format
eslint . --format json

# Show only errors (no warnings)
eslint . --quiet

# Exit with error code if issues found
eslint . --max-warnings 0
```

### IDE Integration

#### VS Code
Install the ESLint extension and add to `settings.json`:

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### WebStorm/IntelliJ
1. Go to Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable ESLint
3. Set configuration file to `eslint.config.js`

## Rules and Standards

### Code Style Rules

#### Indentation and Formatting
- **Indent**: 2 spaces (not tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Always required
- **Trailing Commas**: Required in multiline structures
- **Line Endings**: Unix-style (LF)

#### TypeScript Specific
- **No `any` types**: Use proper TypeScript types
- **No unused variables**: Remove or prefix with `_`
- **Prefer `const`**: Use `const` over `let` when possible
- **No `var`**: Use `let` or `const` instead

#### Function and Object Style
- **Brace Style**: 1tbs (one true brace style)
- **Function Spacing**: Space before anonymous functions, none before named
- **Object Spacing**: Spaces inside curly braces
- **Array Spacing**: No spaces inside brackets

### Example of Good Code

```typescript
// ✅ Good
import { Request, Response } from 'express';

const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;
    const user = await userService.create({ name, email });
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export { createUser };
```

### Example of Bad Code

```typescript
// ❌ Bad
import {Request,Response} from "express"

var createUser = async (req:Request,res:Response)=>{
try{
const {name,email} = req.body
var user = await userService.create({name,email})
res.status(201).json({success:true,user})
}catch(error){
console.error("Error creating user:",error)
res.status(500).json({success:false,error:"Internal server error"})
}
}

export {createUser}
```

## Integration

### Pre-commit Hooks

Install husky for Git hooks:

```bash
pnpm add -D husky lint-staged
```

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky install",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "git add"],
    "*.{js,jsx}": ["eslint --fix", "git add"]
  }
}
```

### CI/CD Integration

#### GitHub Actions
```yaml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm run lint
```

#### Jenkins Pipeline
```groovy
pipeline {
  agent any
  stages {
    stage('Lint') {
      steps {
        sh 'pnpm run lint'
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
**Problem**: ESLint can't find TypeScript modules
**Solution**: Ensure `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are installed

#### 2. Configuration not working
**Problem**: ESLint ignores configuration file
**Solution**: 
- Check file name is `eslint.config.js` (not `.eslintrc.js`)
- Verify configuration syntax
- Restart IDE/editor

#### 3. Too many errors
**Problem**: Overwhelming number of linting errors
**Solution**:
```bash
# Fix automatically fixable issues first
pnpm run lint:fix

# Then address remaining issues gradually
```

#### 4. Performance issues
**Problem**: ESLint runs slowly
**Solution**:
- Add more files to `ignores` array
- Use `.eslintignore` file for additional ignores
- Consider using `--cache` option

### Error Codes Reference

| Rule | Description | Fixable |
|------|-------------|---------|
| `@typescript-eslint/no-unused-vars` | Unused variables | Manual |
| `@typescript-eslint/no-explicit-any` | Use of `any` type | Manual |
| `quotes` | Quote style | Auto |
| `semi` | Missing semicolon | Auto |
| `indent` | Incorrect indentation | Auto |
| `comma-dangle` | Missing trailing comma | Auto |
| `no-trailing-spaces` | Trailing whitespace | Auto |

## Best Practices

### 1. Gradual Adoption
- Start with basic rules
- Gradually add more strict rules
- Use `--fix` to handle formatting issues

### 2. Team Consistency
- Share configuration across team
- Document rule decisions
- Use pre-commit hooks

### 3. Performance
- Ignore generated files
- Use caching in CI/CD
- Consider using `--cache` option

### 4. Custom Rules
- Create project-specific rules when needed
- Document custom rule purposes
- Keep rules maintainable

### 5. IDE Integration
- Configure auto-fix on save
- Show ESLint errors in editor
- Use ESLint extensions

## Migration from Legacy Config

If migrating from `.eslintrc.js`:

1. **Install new packages**:
   ```bash
   pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```

2. **Create new config**:
   - Rename `.eslintrc.js` to `eslint.config.js`
   - Convert to flat config format
   - Update rule syntax

3. **Test configuration**:
   ```bash
   pnpm run lint
   ```

4. **Update scripts**:
   ```json
   {
     "scripts": {
       "lint": "eslint .",
       "lint:fix": "eslint . --fix"
     }
   }
   ```

## Resources

- [ESLint Documentation](https://eslint.org/docs/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- [VS Code ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Current Status

**Last Updated**: September 2025
**ESLint Version**: 9.35.0
**TypeScript ESLint**: 8.42.0
**Issues Found**: 30 (18 errors, 12 warnings)
**Auto-fixable**: 0 (all formatting issues resolved)

### Recent Improvements
- ✅ Migrated to ESLint v9 flat config
- ✅ Added TypeScript support
- ✅ Fixed 1066+ formatting issues automatically
- ✅ Configured development-friendly rules
- ✅ Added CI/CD integration scripts
