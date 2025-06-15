async function testSignatureTimestamps() {
  try {
    const fetch = (await import('node-fetch')).default
    
    // Login as HR
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@company.com', password: 'password123' })
    })
    
    const loginData = await loginResponse.json()
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error)
      return
    }
    
    console.log('✅ Login successful')
    
    // Get Alice's user ID
    const aliceId = 'cmbwrfhls0003qinswwt7al38'
    
    // Test metrics API
    const metricsResponse = await fetch(`http://localhost:3000/api/hr/users/${aliceId}/metrics?months=12`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    })
    
    if (!metricsResponse.ok) {
      console.error('❌ Metrics API failed:', metricsResponse.status)
      return
    }
    
    const metricsData = await metricsResponse.json()
    console.log('✅ Metrics API successful')
    
    // Check if signature timestamps are included
    const recentTimesheets = metricsData.recentTimesheets
    console.log(`📋 Found ${recentTimesheets.length} recent timesheets`)
    
    if (recentTimesheets.length > 0) {
      const timesheet = recentTimesheets[0]
      console.log('🔍 Checking first timesheet for signature timestamps:')
      console.log(`   - Staff Signature: ${timesheet.staffSig ? '✅' : '❌'}`)
      console.log(`   - Staff Signed At: ${timesheet.staffSigAt || 'Not set'}`)
      console.log(`   - Manager Signature: ${timesheet.managerSig ? '✅' : '❌'}`)
      console.log(`   - Manager Signed At: ${timesheet.managerSigAt || 'Not set'}`)
      console.log(`   - HR Signature: ${timesheet.hrSig ? '✅' : '❌'}`)
      console.log(`   - HR Signed At: ${timesheet.hrSigAt || 'Not set'}`)
      
      if (timesheet.staffSigAt || timesheet.managerSigAt || timesheet.hrSigAt) {
        console.log('🎉 SUCCESS: Signature timestamps are working!')
      } else {
        console.log('⚠️  WARNING: No signature timestamps found')
      }
    } else {
      console.log('⚠️  No timesheets found to test')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testSignatureTimestamps() 