# 验证记录

2026-11-01，Apple M2，Apple clang 14，Python 3.13。

`python3 verify.py` 在 server.py 运行时执行：22 项全部通过。13 课全部参考答案均开启 ASan/UBSan 后编译并通过断言。另验证故意语法错误、断言失败、无限循环超时、大输出截断、缺失 CSRF、跨源拒绝、超长代码拒绝、真实 HTTP 测试和页面可达。结果保存在 verification.json。

CMake 当前机器未安装，未声称已运行 CMake 构建。示例可直接 clang++ 构建。网页编译不依赖 CMake。

这不是恶意代码沙箱：没有文件/网络/内存权限隔离。学习报告与草稿不上传。
