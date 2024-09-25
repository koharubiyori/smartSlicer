## Smart Slicer

这是一个从视频中收集语音素材用于AI翻唱炼丹的小工具。使用Electron开发。

自动筛选切片功能基于此项目的声纹对比功能：[VoiceprintRecognition-Pytorch](https://github.com/yeyupiaoling/VoiceprintRecognition-Pytorch)

### 基本用法

1. 填写完整视频路径 -> 填写字幕文件路径(或使用生成字幕功能) -> 填写切片路径 -> 执行切片
1. 说话人管理 -> 添加说话人 -> 填写名称和快捷键 -> 上传声音样本(可选，如果要自动筛选切片)
1. 筛选切片
1. 输出结果

还提供一个不包含AI功能的版本，其中无法使用生成字幕和自动筛选功能。

### 默认快捷键

* 【方向键↑】：标记当前切片为“默认说话人”
* 【方向键↓】：移除当前切片标记
* 【方向键←】：切片列表后退
* 【方向键←】：切片列表前进
* 【空格】：重播当前切片

### 自动筛选相关参数

自动筛选功能会对当前左侧显示的声音列表进行筛选。

* 评估阈值：根据这个值对相似度推理结果进行评估，具体见下面的评估模式
* 评估模式：
  * 快速：切片和说话人任意声音样本的相似度大于等于阈值即匹配。选中这个时计算方法选项无效。若相似度全部小于阈值则无匹配
  * 通常：推理切片与所有声音样本的相似度，之后根据计算方法进行评估。若相似度全部小于阈值则无匹配
  * 严格：行为同通常模式，但某说话人的任意声音样本小于阈值即算作与那个说话人不匹配
* 计算方法：
  * 平均值：计算说话人所有声音样本与切片的相似度的平均值，取平均值最高的说话人
  * 最大值：推理所有说话人的所有声音样本的相似度，取结果值最高的那个声音样本的所属说话人
* 强制匹配：如果无匹配，则无视阈值重新进行评估，也就是说必然会匹配一个说话人。评估模式为严格时无效
* 工作进程数：可以打开任务管理器查看资源占用，根据实际资源占用调整进程数

### 其他提示

* **现阶段自动筛选能力有限，不要过于期待**
* 关于声音样本：5秒~10秒之间，尽量提取干净的干声
* ffmpeg工作进程数应根据cpu性能选择，推荐2或3，最好不要大于4。如果切片中频繁提示失败，一般代表设置的进程数过多
* 使用自动筛选时，切片最好提前进行去背景音处理，如果不对切片进行去背景音处理，建议使用低阈值或开启强制匹配。背景音对相似度推理影响非常大
* 音频也可以像视频一样进行切片等操作
* 视频进度条左右两侧为剪辑游标，拖动可以剪辑，主要用来处理切片开头结尾混入的他人语音
* 自动筛选是对左侧显示的列表进行筛选，可以第一遍自动筛选后切换切片列表再手动筛选或进行多次自动筛选
* 没有字幕文件且电脑配置较低可以用剪映国际版(CapCut)生成，这个支持多语言字幕，生成效果也比较好
