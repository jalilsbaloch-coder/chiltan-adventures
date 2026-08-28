const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/server/routes/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace .all() with execute() and rows
  content = content.replace(/db\.prepare\((.*?)\)\.all\(\)/g, "await db.execute($1).then(r => r.rows)");
  
  // Replace .get(val) with execute
  content = content.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, "await db.execute({ sql: $1, args: [$2] }).then(r => r.rows[0])");
  
  // Replace .run(...) with execute
  content = content.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, "await db.execute({ sql: $1, args: [$2] })");
  
  // Replace stmt.run(...) with db.execute
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\s*const result = stmt\.run\((.*?)\);/gs, "const result = await db.execute({ sql: $1, args: [$2] });");
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\s*stmt\.run\((.*?)\);/gs, "await db.execute({ sql: $1, args: [$2] });");
  
  // Add async to route handlers if not present
  content = content.replace(/((?:get|post|put|delete)\([^,]+, (?:requireAuth, )?(?:upload\.single\('[^']+'\), )?)\(req, res\)/g, "$1async (req, res)");
  
  // Make lastInsertRowid work
  content = content.replace(/result\.lastInsertRowid/g, "result.lastInsertRowid.toString()");
  
  fs.writeFileSync(file, content);
}
