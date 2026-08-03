const fs = require('fs');
const path = require('path');
const root = process.cwd();
const exts = ['.ts','.tsx','.js','.jsx','.json','.css','.png','.jpg','.jpeg','.svg','.html'];
function walk(dir){
  const entries = fs.readdirSync(dir, {withFileTypes:true});
  let files = [];
  for(const e of entries){
    const p = path.join(dir,e.name);
    if(e.isDirectory()){ if(e.name==='node_modules' || e.name==='dist' || e.name==='.git') continue; files = files.concat(walk(p)); }
    else files.push(p);
  }
  return files;
}
const files = walk(root).filter(f=>/\.(ts|tsx|js|jsx|html|css)$/.test(f));
const relRegex = /(?:from\s+|require\(|src=\"|href=\"|url\()\s*['\"]?(\.\/?\.\/?[^'\")\s]+)['\"]?\)?/g;
let missing = [];
for(const file of files){
  const text = fs.readFileSync(file,'utf8');
  let m;
  while((m = relRegex.exec(text)) !== null){
    const ref = m[1];
    if(!ref) continue;
    // ignore protocol or data
    if(ref.startsWith('http')||ref.startsWith('data:')) continue;
    const base = path.dirname(file);
    // strip URL fragment and query
    const refClean = ref.split(/[?#]/)[0];
    const candidate = path.resolve(base, refClean);
    let found = false;
    // if exact file exists
    if(fs.existsSync(candidate)) found = true;
    else{
      // try extensions
      for(const ex of exts){ if(fs.existsSync(candidate+ex)){ found=true; break; } }
      // try index files in dir
      for(const ex of exts){ if(fs.existsSync(path.join(candidate,'index'+ex))){ found=true; break; } }
    }
    if(!found){ missing.push({file: path.relative(root,file), ref, resolved: path.relative(root,candidate)});
    }
  }
}
if(missing.length===0){ console.log('No missing relative paths found.'); process.exit(0); }
console.log('Missing references:');
missing.forEach(x=> console.log(`${x.file} -> ${x.ref} (resolved: ${x.resolved})`));
process.exit(1);
