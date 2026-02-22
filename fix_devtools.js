const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            callback(path.join(dirPath));
        }
    });
}

walkDir('./src/app', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Remove import
    content = content.replace(/import\s+\{\s*DevTool\s*\}\s+from\s+['"]@hookform\/devtools['"];?\r?\n/g, '');
    
    // Remove component usage
    content = content.replace(/\{\s*process\.env\.NODE_ENV\s*!==\s+['"]production['"]\s*&&\s*<\s*DevTool[^>]*>\s*\}/g, '');
    content = content.replace(/<\s*DevTool[^>]*\/>/g, '');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', filePath);
    }
});
