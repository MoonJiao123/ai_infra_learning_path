import server,json,urllib.request,urllib.error,time
checks=[]
def check(name,condition):
 checks.append((name,bool(condition))); print(('PASS ' if condition else 'FAIL ')+name,flush=True)
for l in server.LESSONS:
 r=server.execute(l['answer'],l['id'],'test',True); check('参考答案 '+l['title'],r['ok'])
 if not r['ok']: print(r)
r=server.execute('int total(int a,int b){return 0;}',0,'test'); check('断言失败反馈',not r['ok'] and 'assert' in r['output'].lower())
r=server.execute('int main( {',0,'run');check('编译错误反馈',not r['ok'] and r['phase']=='编译')
r=server.execute('int main(){while(true){}}',0,'run');check('无限循环超时',not r['ok'] and '时间' in r['feedback'])
r=server.execute('#include <iostream>\nint main(){while(true)std::cout<<"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";}',0,'run');check('输出上限',not r['ok'] and '24 KB' in r['feedback'])
base='http://127.0.0.1:8765'
init=json.load(urllib.request.urlopen(base+'/api/init'))
def post(body,headers):
 try:
  req=urllib.request.Request(base+'/api/run',json.dumps(body).encode(),headers=headers);return urllib.request.urlopen(req).status
 except urllib.error.HTTPError as e:return e.code
check('拒绝无CSRF请求',post({}, {'Origin':base})==403)
check('拒绝跨源请求',post({}, {'Origin':'http://evil.example','X-CSRF-Token':init['token']})==403)
headers={'Origin':base,'X-CSRF-Token':init['token'],'Content-Type':'application/json'}
check('拒绝超长代码',post({'code':'x'*40001,'lesson':0,'mode':'run'},headers)==400)
check('真实HTTP编译测试',post({'code':server.LESSONS[0]['answer'],'lesson':0,'mode':'test'},headers)==200)
check('网页可达',urllib.request.urlopen(base).status==200)
with open(server.ROOT/'verification.json','w') as f:json.dump(dict(checks=checks,all_pass=all(v for _,v in checks)),f,ensure_ascii=False,indent=2)
assert all(v for _,v in checks)
