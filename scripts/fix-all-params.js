const fs = require('fs')
const path = require('path')

// Function to fix async params in a file
function fixAsyncParams(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Fix function signatures - match the exact pattern
    const functionRegex = /export async function (GET|POST|PUT|DELETE|PATCH)\s*\(\s*request:\s*NextRequest,\s*{\s*params\s*}\s*:\s*{\s*params:\s*{\s*([^}]+)\s*}\s*}\s*\)/g
    
    content = content.replace(functionRegex, (match, method, paramsType) => {
      modified = true
      return `export async function ${method}(
  request: NextRequest,
  { params }: { params: Promise<{ ${paramsType} }> }
)`
    })

    // Add await params destructuring after try {
    const tryRegex = /(\s*)\{\s*params\s*\}\s*:\s*{\s*params:\s*Promise<\{([^}]+)\}>\s*}\s*\)\s*\{[\s\n]*try\s*\{/g
    
    content = content.replace(tryRegex, (match, indent, paramsType) => {
      const paramNames = paramsType.split(',').map(p => p.trim().split(':')[0].trim())
      const destructuring = paramNames.map(name => name).join(', ')
      modified = true
      return `${indent}{ params }: { params: Promise<{${paramsType}}> }
) {
    const { ${destructuring} } = await params
    
    try {`
    })

    // Replace all instances of params.id with id, params.entryId with entryId, etc.
    const paramMatches = content.match(/params\.(\w+)/g)
    if (paramMatches) {
      const uniqueParams = [...new Set(paramMatches)]
      uniqueParams.forEach(param => {
        const paramName = param.split('.')[1]
        const regex = new RegExp(`params\\.${paramName}`, 'g')
        if (content.match(regex)) {
          content = content.replace(regex, paramName)
          modified = true
        }
      })
    }

    if (modified) {
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

// Function to recursively find and fix route files
function fixRouteFiles(dir) {
  const files = fs.readdirSync(dir)
  let fixedCount = 0

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      fixedCount += fixRouteFiles(filePath)
    } else if (file === 'route.ts' && filePath.includes('/api/')) {
      if (fixAsyncParams(filePath)) {
        fixedCount++
      }
    }
  })

  return fixedCount
}

// Main execution
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api')
console.log('🔧 Fixing async params in all route files...')

if (fs.existsSync(apiDir)) {
  const fixedCount = fixRouteFiles(apiDir)
  console.log(`\n✅ Fixed ${fixedCount} route files`)
} else {
  console.error('❌ API directory not found:', apiDir)
} 