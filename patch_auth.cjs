const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'server', 'routes', 'auth.ts');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace("authRouter.post('/login'", `authRouter.get('/mode', (req, res) => {
  res.json({ isDemoMode: !process.env.DB_HOST });
});

authRouter.post('/login'`);

fs.writeFileSync(filePath, code);
