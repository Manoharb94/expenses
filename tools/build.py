#!/usr/bin/env python3
"""Run before every commit that changes js/*.js:  python3 tools/build.py
Gives each script tag in app.html a fingerprint (?v=...) from the file's content and lists the files in sw.js,
so a changed file is always fetched fresh and old/new files never mix."""
import hashlib,re,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h=open(root+'/app.html',encoding='utf-8').read()
import subprocess,sys
subprocess.check_call([sys.executable,root+'/tools/build_hi.py'])
hd=hashlib.sha1(open(root+'/js/hi.js','rb').read()).hexdigest()[:8]
ip=root+'/js/i18n.js';it=open(ip,encoding='utf-8').read()
it=re.sub(r'var HI_SRC="[^"]*";','var HI_SRC="js/hi.js?v=%s";'%hd,it);open(ip,'w',encoding='utf-8').write(it)
urls=['js/hi.js?v=%s'%hd]
def fix(m):
    f=m.group(1); d=hashlib.sha1(open(root+'/js/'+f,'rb').read()).hexdigest()[:8]
    urls.append('js/%s?v=%s'%(f,d)); return '<script src="js/%s?v=%s"></script>'%(f,d)
h=re.sub(r'<script src="js/([a-z0-9-]+\.js)(?:\?v=[0-9a-f]+)?"></script>',fix,h)
open(root+'/app.html','w',encoding='utf-8').write(h)
s=open(root+'/sw.js',encoding='utf-8').read()
s=re.sub(r'var JSF=\[.*?\];','var JSF=['+','.join('"%s"'%u for u in urls)+'/*JS*/];',s,flags=re.S)
open(root+'/sw.js','w',encoding='utf-8').write(s)
print(len(urls),'script files fingerprinted')
