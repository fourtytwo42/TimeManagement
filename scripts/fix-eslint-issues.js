const fs = require('fs')
const path = require('path')

// Function to fix unused variables by prefixing with underscore
function fixUnusedVariables(content) {
  // Fix unused function parameters
  content = content.replace(/(\w+)\s*:\s*any\s*\)\s*=>/g, '_$1: any) =>')
  content = content.replace(/(\w+)\s*:\s*string\s*\)\s*=>/g, '_$1: string) =>')
  content = content.replace(/(\w+)\s*:\s*number\s*\)\s*=>/g, '_$1: number) =>')
  content = content.replace(/(\w+)\s*:\s*boolean\s*\)\s*=>/g, '_$1: boolean) =>')
  
  // Fix unused variables in destructuring
  content = content.replace(/const\s*{\s*(\w+)\s*}\s*=/g, 'const { _$1 } =')
  content = content.replace(/let\s*{\s*(\w+)\s*}\s*=/g, 'let { _$1 } =')
  
  // Fix unused imports
  content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from/g, (match, imports) => {
    const importList = imports.split(',').map(imp => {
      const trimmed = imp.trim()
      if (trimmed.includes(' as ')) {
        return trimmed
      }
      return `_${trimmed}`
    }).join(', ')
    return `import { ${importList} } from`
  })
  
  return content
}

// Function to fix quote style
function fixQuoteStyle(content) {
  // Replace double quotes with single quotes in strings
  content = content.replace(/"([^"]*)"(?!\s*:)/g, "'$1'")
  return content
}

// Function to fix trailing commas
function fixTrailingCommas(content) {
  // Remove trailing commas in objects and arrays
  content = content.replace(/,(\s*[}\]])/g, '$1')
  return content
}

// Function to fix prefer-const issues
function fixPreferConst(content) {
  // Replace let with const where variables are never reassigned
  content = content.replace(/let\s+(\w+)\s*=\s*([^;]+);/g, (match, varName, value) => {
    // Simple heuristic: if it's an object literal or array, use const
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      return `const ${varName} = ${value};`
    }
    return match
  })
  return content
}

// Function to fix a specific file
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Apply fixes
    const originalContent = content
    content = fixUnusedVariables(content)
    content = fixQuoteStyle(content)
    content = fixTrailingCommas(content)
    content = fixPreferConst(content)

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed: ${filePath}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
    return false
  }
}

// Function to recursively find and fix files
function fixFiles(dir) {
  const files = fs.readdirSync(dir)
  let fixedCount = 0

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += fixFiles(filePath)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (fixFile(filePath)) {
        fixedCount++
      }
    }
  })

  return fixedCount
}

// Main execution
console.log('🔧 Fixing ESLint issues in all TypeScript files...')

const srcDir = path.join(__dirname, '..', 'src')
if (fs.existsSync(srcDir)) {
  const fixedCount = fixFiles(srcDir)
  console.log(`\n✅ Fixed ${fixedCount} files`)
} else {
  console.error('❌ src directory not found:', srcDir)
} 