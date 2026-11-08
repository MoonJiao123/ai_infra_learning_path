const $=id=>document.getElementById(id);let lessons,token,current=0,hint=0,state;const KEY='cpp-lab-v1';
try{state=JSON.parse(localStorage.getItem(KEY))||{};}catch{state={};}state.drafts ||= {};state.done ||= {};state.predictions ||= {};state.free ||= {};state.failures ||= [];state.notes ||= "";current=Number(state.current)||0;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saved').textContent='已自动保存 · '+new Date().toLocaleTimeString();}catch{$('saved').textContent='浏览器无法保存，请复制代码备份';}}
function save(){state[$('mode').value==='test'?'drafts':'free'][current]=$('editor').value;persist();}
function navigation(){let w=0;$('nav').replaceChildren();lessons.forEach((l,i)=>{if(l.week!==w){w=l.week;let h=document.createElement('h3');h.textContent=`WEEK 0${w}`;$('nav').append(h);}let b=document.createElement('button');b.textContent=`${state.done[i]?'✓':'○'} ${i+1}. ${l.title}`;b.className=i===current?'active':'';b.onclick=()=>{save();render(i)};$('nav').append(b);});$('progress').textContent=`已通过 ${Object.keys(state.done).length} / ${lessons.length} 课`;}
const freeStarter='#include <iostream>\nint main() {\n  std::cout << "Hello, C++!\\n";\n}\n';
function editor(){let key=$('mode').value==='test'?'drafts':'free';$('editor').value=state[key][current]??(key==='drafts'?lessons[current].starter:freeStarter);$('run').textContent=key==='drafts'?'编译并测试':'编译并运行';}
function renderLessonSteps(steps = []) {
  const container = $('lessonSteps');
  container.replaceChildren();
  if (!steps.length) return;

  const instructions = document.createElement('p');
  instructions.className = 'muted';
  instructions.textContent = '先預測輸出，再按「執行這段範例」。範例有自己的輸出區。';
  container.append(instructions);

  for (const step of steps) {
    const panel = document.createElement('details');
    const title = document.createElement('summary');
    const explanation = document.createElement('p');
    const code = document.createElement('pre');
    const run = document.createElement('button');
    const result = document.createElement('pre');
    const expected = document.createElement('details');
    const expectedTitle = document.createElement('summary');
    const output = document.createElement('pre');

    panel.open = Boolean(step.openByDefault);
    title.textContent = step.title;
    run.textContent = '執行這段範例';
    result.hidden = true;
    result.setAttribute('role', 'status');
    const lessonId = current;
    run.onclick = async () => {
      run.disabled = true;
      result.hidden = false;
      result.textContent = '正在編譯與執行…';
      try {
        const data = await runCpp(step.code, lessonId, 'run');
        result.textContent = data.ok ? data.output || '（沒有輸出）'
          : [data.error || data.feedback, data.output].filter(Boolean).join('\n');
      } catch {
        result.textContent = '無法連線到本地服務。請重新整理後再試。';
      } finally {
        run.disabled = false;
      }
    };
    explanation.textContent = step.explanation;
    code.textContent = step.code;
    expectedTitle.textContent = '核对预期输出';
    output.textContent = step.output;
    expected.append(expectedTitle, output);
    panel.append(title, explanation, code, run, result, expected);
    container.append(panel);
  }
}
function render(i){current=Math.max(0,Math.min(i,lessons.length-1));state.current=current;hint=0;persist();let l=lessons[current];for(let k of ['title','explain','concept','tests','answer'])$(k).textContent=l[k];renderLessonSteps(l.steps);$('exercise').textContent=l.exercise??'';$('exercise').hidden=!l.exercise;$('week').textContent=`WEEK 0${l.week} / LESSON ${String(current+1).padStart(2,'0')}`;$('prediction').textContent=l.predict;$('choices').replaceChildren();l.choices.forEach((c,j)=>{let b=document.createElement('button');b.textContent=c;b.onclick=()=>{state.predictions[current]=j;persist();$('predictionResult').textContent=j===l.correct?('✓ '+(l.predictionFeedback||'对了。现在用代码验证你的理解。')):'再想一下：'+l.hints[0];};$('choices').append(b);});$('predictionResult').textContent=state.predictions[current]===l.correct?'✓ 已答对本课预测题。':'';$('hints').textContent='';$('solution').open=false;$('result').className='';$('result').firstElementChild.textContent='准备好后，试着运行一次。';$('output').textContent='';$('mode').value='test';editor();navigation();window.scrollTo(0,0);}
$('editor').oninput=save;$('editor').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();let t=e.target,a=t.selectionStart,b=t.selectionEnd;t.setRangeText('  ',a,b,'end');save();}};
$('mode').onchange=editor;$('reset').onclick=()=>{if(confirm('恢复当前模式的初始代码？此课其他进度保留。')){delete state[$('mode').value==='test'?'drafts':'free'][current];editor();persist();}};
$('resetAll').onclick=()=>{if(confirm('删除全部课程草稿、预测记录与通过进度？')){state={drafts:{},free:{},done:{},predictions:{},failures:[],notes:'',current:0};$('notes').value='';persist();render(0);}};
$('hint').onclick=()=>{let h=lessons[current].hints;hint=Math.min(hint+1,h.length);$('hints').textContent=h.slice(0,hint).map((s,i)=>`${i+1}. ${s}`).join('\n');};$('useAnswer').onclick=()=>{$('mode').value='test';$('editor').value=lessons[current].answer;save();};$('prev').onclick=()=>{save();render(current-1)};$('next').onclick=()=>{save();render(current+1)};
async function runCpp(code, lesson, mode) {
  const response = await fetch('/api/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': token},
    body: JSON.stringify({code, lesson, mode, sanitize: $('san').checked}),
  });
  return response.json();
}

$('run').onclick=async()=>{save();let id=current,mode=$('mode').value;$('run').disabled=true;$('result').firstElementChild.textContent='编译中…（最长 20 秒；运行最长 3 秒）';$('output').textContent='';try{let data=await runCpp($('editor').value,id,mode);if(current===id){$('result').className=data.ok?'good':'bad';$('result').firstElementChild.textContent=data.error||data.feedback;$('output').textContent=data.output||'';}if(!data.ok){state.failures.push({lesson:lessons[id].title,time:new Date().toISOString(),feedback:data.feedback||data.error,output:(data.output||'').slice(0,3000)});state.failures=state.failures.slice(-30);persist();}if(data.ok&&mode==='test'){state.done[id]=true;persist();navigation();}}catch(e){$('result').firstElementChild.textContent='无法连接本地服务，请确认 server.py 仍在运行。';}finally{$('run').disabled=false;}};
const faq=[['assert|断言|测试失败','assert(条件) 表示这个条件必须为真。失败时输出源码行和表达式。把输入代入函数，逐步检查哪里偏离预期；不要删除断言来通过测试。'],['编译|error|分号','先读第一条 error，找到 practice.cpp 对应行。练习模式会添加头文件与 main，所以行号包含这些额外行。检查函数名、返回类型、分号与括号；warning 是警告，也值得修正。'],['引用|指针|const','引用是同一对象的别名；指针保存地址，使用前检查是否为空；const 限制通过该名字修改对象。可回看第 4 课。'],['迭代器|失效|vector','vector 扩容会使旧迭代器失效；list 的 splice 不会使被移动节点的迭代器失效；unordered_map 的 rehash 会使其迭代器失效。修改后重新获取位置通常更容易推理。'],['move|移动|拷贝','std::move 允许对象作为可移动值使用，本身不搬数据。unique_ptr 移动后原指针为空；一般容器移动后有效但状态未指定。'],['LRU|缓存|淘汰','list 头部为最近使用，尾部为最久未用；map 定位节点。get 命中和 put 更新都刷新顺序。先处理容量 0，再处理旧键，最后处理新键与淘汰。'],['RAII|智能|生命周期|堆|栈','局部对象离开作用域就销毁。RAII 把释放资源放在析构中，unique_ptr 表达唯一所有权。不要返回局部变量地址。'],['cmake|调试|sanitizer|越界','第 13 课提供 CMake 和 lldb 命令，交付包 tools-demo 可本地构建。网页检查器开关会在编译时开启 ASan 与 UBSan；它们只能发现运行路径上发生的部分问题。']];
$('ask').onclick=()=>{let q=$('question').value;let hit=faq.find(([pattern])=>new RegExp(pattern,'i').test(q));$('reply').textContent=hit?hit[1]:'本地知识库还无法回答这个问题。可以展开本课提示，或用下面的按钮复制问题、代码和运行反馈到 Codex。';};$('copy').onclick=async()=>{let context=`我在学习 C++：${lessons[current].title}\n问题：${$('question').value}\n请先给渐进提示，不要直接给答案。\n代码：\n${$('editor').value}\n运行反馈：${$('result').innerText}`;try{await navigator.clipboard.writeText(context);$('reply').textContent='已复制。回到 Codex 粘贴即可继续提问。';}catch{$('reply').textContent='剪贴板权限不可用，请手动复制：\n'+context;}};
fetch('/api/init').then(r=>r.json()).then(d=>{lessons=d.lessons;token=d.token;render(current)}).catch(()=>{$('title').textContent='本地服务未连接，请通过启动脚本打开。'});

$('notes').value=state.notes;$('notes').oninput=()=>{state.notes=$('notes').value;persist();};$('export').onclick=()=>{let report={exportedAt:new Date().toISOString(),stage:'阶段一 · 四周 C++',completed:lessons.filter(l=>state.done[l.id]).map(l=>l.title),predictions:state.predictions,notes:state.notes,failures:state.failures};let url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));let a=document.createElement('a');a.href=url;a.download='cpp-learning-report.json';a.click();URL.revokeObjectURL(url);};
