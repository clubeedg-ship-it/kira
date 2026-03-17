const fs = require('fs');
const path = require('path');

// Mock function for sending email - in reality would use an API or SMTP
async function sendEmail(to, subject, body) {
    console.log(`[MOCK SEND] To: ${to} | Subject: ${subject}`);
    // In production, this would actually send the email
    return { success: true, message_id: 'mock_' + Math.random().toString(36).substr(2, 9) };
}

async function runOutreach() {
    const prospectsPath = path.join(__dirname, 'prospects.csv');
    const templatesDir = path.join(__dirname, 'templates');
    
    // Simple CSV parser
    const data = fs.readFileSync(prospectsPath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    const prospects = lines.slice(1).map(line => {
        // Handle basic quoted strings in CSV
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!values) return null;
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i] ? values[i].replace(/"/g, '').trim() : '';
        });
        return obj;
    }).filter(p => p !== null);

    console.log(`Loaded ${prospects.length} prospects.`);

    for (const prospect of prospects) {
        if (prospect.status === 'not_contacted' && prospect.priority === 'high') {
            let templateName = '';
            if (prospect.type === 'spa') templateName = 'spa_retail.md';
            else if (prospect.type === 'retailer') templateName = 'indie_retail.md';
            
            if (templateName) {
                const templatePath = path.join(templatesDir, templateName);
                if (fs.existsSync(templatePath)) {
                    let content = fs.readFileSync(templatePath, 'utf8');
                    
                    // Simple variable replacement
                    const subjectMatch = content.match(/Subject: (.*)/);
                    const subject = subjectMatch ? subjectMatch[1] : 'Inquiry from Abura Cosmetics';
                    
                    // Remove the template header/subject lines from body
                    let body = content.replace(/# Template: .*\n/, '').replace(/Subject: .*\n/, '').trim();
                    
                    // Variables
                    body = body.replace(/{{name}}/g, prospect.name);
                    body = body.replace(/{{location}}/g, prospect.location);
                    body = body.replace(/{{contact_person}}/g, 'Team'); // Default since CSV lacks it
                    
                    console.log(`\n--- PREPARING EMAIL FOR ${prospect.name} ---`);
                    console.log(`Subject: ${subject}`);
                    console.log(`Body Snippet: ${body.substring(0, 100)}...`);
                    
                    // SAFETY: We do NOT send unless explicitly triggered
                    console.log(`[SAFETY] Skipping send - awaiting Otto's approval for external outreach.`);
                }
            }
        }
    }
}

runOutreach().catch(err => console.error(err));
