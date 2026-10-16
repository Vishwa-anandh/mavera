import re,sys
import os
t=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'styles', 'app.css'),encoding='utf-8').read()
t=re.sub(r'/\*.*?\*/','',t,flags=re.S)
# flat parse with media context
out=[];i=0;stack=[]
def parse(s,ctx):
    res=[];i=0
    while i<len(s):
        j=s.find('{',i)
        if j<0:break
        sel=s[i:j].strip()
        d=1;k=j+1
        while d and k<len(s):
            d+= (s[k]=='{')-(s[k]=='}');k+=1
        body=s[j+1:k-1]
        if sel.startswith('@media') or sel.startswith('@supports') or sel.startswith('@container'):
            res+=parse(body,ctx+[sel])
        elif sel.startswith('@'): pass
        else: res.append((ctx,sel,' '.join(body.split())))
        i=k
    return res
rules=parse(t,[])
for cls in sys.argv[1:]:
    print('=====',cls)
    pat=re.compile(r'(?<![\w-])\.'+re.escape(cls)+r'(?![\w-])')
    for n,(ctx,sel,body) in enumerate(rules):
        if pat.search(sel): print(f'[{n}]',(' @'.join(c[:40] for c in ctx)+' ' if ctx else ''),sel[:110],'{',body[:300],'}')
