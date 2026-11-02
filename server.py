#!/usr/bin/env python3
import http.server,json,pathlib,subprocess,tempfile,os,signal,threading,time,secrets,selectors
ROOT=pathlib.Path(__file__).resolve().parent
LESSONS=json.loads((ROOT/'lessons.json').read_text())
TOKEN=secrets.token_urlsafe(32); GATE=threading.BoundedSemaphore(2)
HEAD='''#include <iostream>
#include <vector>
#include <string>
#include <list>
#include <unordered_map>
#include <memory>
#include <utility>
#include <cassert>
using namespace std;
'''
def process(args,timeout):
 p=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 sel=selectors.DefaultSelector(); sel.register(p.stdout,selectors.EVENT_READ); out=bytearray(); start=time.monotonic(); reason=''
 try:
  while sel.get_map():
   if time.monotonic()-start>timeout: reason='超过时间限制'; break
   for key,_ in sel.select(.05):
    data=os.read(key.fileobj.fileno(),4096)
    if not data: sel.unregister(key.fileobj); break
    out.extend(data)
    if len(out)>24000: reason='输出超过 24 KB，已停止'; break
   if reason: break
  if reason:
   try: os.killpg(p.pid,signal.SIGKILL)
   except ProcessLookupError: pass
  p.wait(timeout=2)
 finally:
  sel.close(); p.stdout.close()
  try: os.killpg(p.pid,signal.SIGKILL)
  except ProcessLookupError: pass
 return p.returncode,out[:24000].decode(errors='replace'),reason

def execute(code,lesson,mode,sanitize=False):
 if mode=='test': code=HEAD+'\n'+code+'\nint main(){\n'+LESSONS[lesson]['tests']+'\ncout << "全部测试通过\\n";\n}\n'
 with tempfile.TemporaryDirectory(prefix='cpp-lab-') as d:
  src=pathlib.Path(d)/'practice.cpp'; src.write_text(code); binary=str(pathlib.Path(d)/'practice')
  args=['clang++','-std=c++17','-Wall','-Wextra','-g',str(src),'-o',binary]
  if sanitize: args+=['-fsanitize=address,undefined','-fno-omit-frame-pointer']
  rc,out,reason=process(args,20)
  if rc or reason: return dict(ok=False,phase='编译',output=out,feedback=reason or '编译失败：从第一条 error 开始检查类型、分号和函数签名。')
  rc,run,reason=process([binary],3)
  return dict(ok=rc==0 and not reason,phase='运行',output=out+run,feedback=reason or ('测试通过。再试着解释每个边界为什么成立。' if mode=='test' and rc==0 else '程序正常结束。' if rc==0 else '程序失败：assert 表达式指出未满足的预期；检查输入与边界。'),exitCode=rc)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
 def end_headers(self):
  self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); super().end_headers()
 def valid(self): return self.headers.get('Host')==f'127.0.0.1:{self.server.server_port}'
 def respond(self,obj,status=200):
  data=json.dumps(obj,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
 def do_GET(self):
  if not self.valid(): return self.respond({'error':'Host 不允许'},403)
  if self.path=='/api/init': return self.respond(dict(token=TOKEN,lessons=LESSONS))
  if self.path.split('?')[0] not in ['/','/index.html','/app.js','/style.css']: return self.respond({'error':'未找到'},404)
  super().do_GET()
 def do_POST(self):
  origin=f'http://127.0.0.1:{self.server.server_port}'
  if not self.valid() or self.headers.get('Origin')!=origin or self.headers.get('X-CSRF-Token')!=TOKEN: return self.respond({'error':'同源或 CSRF 校验失败'},403)
  if self.path!='/api/run': return self.respond({'error':'未找到'},404)
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=70000: return self.respond({'error':'请求过大或为空'},413)
   body=json.loads(self.rfile.read(size)); code=body['code']; lesson=body['lesson']; mode=body['mode']
   if not isinstance(code,str) or len(code.encode())>40000 or type(lesson)!=int or not 0<=lesson<len(LESSONS) or mode not in ('run','test'): raise ValueError()
  except (ValueError,KeyError,TypeError): return self.respond({'error':'无效请求'},400)
  if not GATE.acquire(False): return self.respond({'error':'已有两个编译任务，请稍后重试'},429)
  try: self.respond(execute(code,lesson,mode,bool(body.get('sanitize'))))
  finally: GATE.release()
if __name__=='__main__':
 import argparse
 ap=argparse.ArgumentParser(); ap.add_argument('--port',type=int,default=8765); args=ap.parse_args()
 print(f'C++ Learning Lab: http://127.0.0.1:{args.port}',flush=True)
 http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
