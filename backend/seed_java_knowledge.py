"""Fill Java subject with structured knowledge from exam review PDF"""
from database import SessionLocal
from models import KnowledgeNode, Subject, Chapter

db = SessionLocal()

subject = db.query(Subject).filter(Subject.id == 4).first()
if not subject:
    print("Subject 4 not found!")
    db.close()
    exit()

chapters = {ch.name: ch.id for ch in db.query(Chapter).filter(Chapter.subject_id == 4).all()}

# Clear old data
db.query(KnowledgeNode).filter(KnowledgeNode.subject_id == 4).delete()

def add_node(title, content, key_terms, chapter_name=None, parent_id=None, order=0, difficulty='medium'):
    ch_id = chapters.get(chapter_name) if chapter_name else None
    n = KnowledgeNode(
        subject_id=4, chapter_id=ch_id, parent_id=parent_id,
        title=title, content=content, key_terms=key_terms,
        order=order, difficulty=difficulty, source='复习&模拟卷PDF'
    )
    db.add(n)
    db.flush()
    return n.id

# ===== 一、考试指南 =====
exam_guide = add_node('考试指南', '', [], None, None, 0, 'easy')

add_node('考试范围', '''### 考试范围：第1-13章

以下小节**不做考试要求**（不考）：

| 章节 | 不考内容 |
|------|----------|
| 2.17 | 软件开发过程 |
| 6.11 | 方法抽象和逐步求精 |
| 7.9 | 可变长参数列表 |
| 10.9 | BigInteger 和 BigDecimal |
| 10.10.3-4 | 字符串相关（部分） |
| 10.10.6 | 字符串相关（部分） |
| 10.11 | StringBuilder |
| 12.10-12.13 | 文件相关 |
| 13.10 | 类的设计原则 |

**其余内容均在考试范围内，请全面复习。**
''', ['考试范围', '不考章节'], None, exam_guide, 0, 'easy')

add_node('题型说明', '''### 考试共5种题型

| 题型 | 题量 | 考察方式 |
|------|------|----------|
| **一、选择题** | 20道 | 对基本概念的全面考察 |
| **二、填空题** | 17道 | 关键术语和核心概念 |
| **三、简答题** | 10道 | 概念解释和简要说明 |
| **四、程序阅读题** | 8道 | 阅读代码写出运行结果 |
| **五、程序设计题** | 5道 | 编写完整程序 |

### 各题型复习重点

- **选择题/填空题**：覆盖范围广，重点复习关键术语、Java语法规则
- **程序阅读题**：重点考察继承、多态、异常处理、值传递
- **程序设计题**：重点考察类定义、接口实现、异常自定义、UML类图
''', ['选择题', '填空题', '简答题', '程序阅读题', '程序设计题'], None, exam_guide, 1, 'easy')

add_node('复习建议', '''### 建议复习路径

1. **通读教材**：重点关注每章后面的关键术语和本章小结
2. **做习题**：教材各章节习题、课后编程题
3. **看PPT**：14讲课件覆盖全部考点
4. **刷模拟卷**：参考模拟卷了解出题风格
5. **重点突破**：继承多态、抽象类接口、异常处理是高频考点

### 参考资料
- 教材各章节课后习题
- 头歌平台作业和实验
- 14讲PPT课件
''', ['复习方法', '教材', 'PPT', '习题'], None, exam_guide, 2, 'easy')

# ===== 二、Java核心术语速查（20个核心术语） =====
glossary = add_node('核心术语速查', '', [], None, None, 1, 'medium')

glossary_items = [
    ('JDK、JRE、JVM',
     '**JDK**（Java Development Kit）：Java开发工具包，包含编译器javac、JRE等开发工具。\n'
     '**JRE**（Java Runtime Environment）：Java运行环境，包含JVM和核心类库。\n'
     '**JVM**（Java Virtual Machine）：Java虚拟机，执行字节码（.class文件）。',
     ['JDK', 'JRE', 'JVM', '编译器', '虚拟机']),
    ('面向对象三大支柱',
     '**封装**（Encapsulation）：隐藏内部实现细节，通过public方法暴露接口。\n'
     '**继承**（Inheritance）：子类继承父类的属性和方法，实现代码复用。\n'
     '**多态**（Polymorphism）：同一方法调用在不同对象上表现出不同行为。',
     ['封装', '继承', '多态', '面向对象']),
    ('抽象类 vs 接口',
     '**抽象类**（abstract class）：不能被实例化，可以有构造方法、实例变量和具体方法。子类用extends继承。\n'
     '**接口**（interface）：全部方法默认public abstract，全部变量默认public static final。'
     '一个类只能继承一个抽象类，但可以实现多个接口（用implements）。',
     ['抽象类', '接口', 'abstract', 'interface', 'extends', 'implements']),
    ('重载 vs 重写',
     '**重载**（Overload）：同一类中同名方法，参数列表不同（数量/类型/顺序）。编译时多态。\n'
     '**重写**（Override）：子类重新定义父类方法，方法签名完全相同（返回类型、方法名、参数列表）。运行时多态（动态绑定）。\n'
     '**注意**：static方法不能被重写。',
     ['重载', '重写', 'Override', 'Overload', '动态绑定', '编译时多态']),
    ('super vs this 关键字',
     '**this**：引用当前对象。用法：(1) 访问当前对象的实例变量 (2) 调用当前对象的其他构造方法 this(...)\n'
     '**super**：引用父类对象。用法：(1) 调用父类构造方法 super(...) 必须是子类构造方法的第一条语句 (2) 访问父类中被覆盖的方法 super.method()',
     ['super', 'this', '关键字', '构造方法']),
    ('可见性修饰符',
     '从小到大排列：\n'
     '1. **private**：仅同类可见\n'
     '2. **默认**（无修饰符）：同包可见\n'
     '3. **protected**：同包 + 子类可见\n'
     '4. **public**：所有类可见',
     ['private', '默认', 'protected', 'public', '可见性', '修饰符', '访问控制']),
    ('异常体系',
     '**Throwable**\n'
     '- **Error**：严重错误，程序无法处理\n'
     '- **Exception**\n'
     '  - **RuntimeException**（免检异常/Unchecked）：NullPointerException、ArrayIndexOutOfBoundsException、ArithmeticException、IndexOutOfBoundsException、IllegalArgumentException\n'
     '  - **必检异常**（Checked Exception）：IOException等，必须用try-catch或throws声明',
     ['异常', 'Exception', 'Error', 'RuntimeException', '免检异常', '必检异常', 'try-catch', 'throw', 'throws']),
    ('装箱与拆箱',
     '**装箱**（Boxing）：基本类型 → 包装类对象。如 `int → Integer`\n'
     '**拆箱**（Unboxing）：包装类对象 → 基本类型。如 `Integer → int`\n'
     '**自动装箱/拆箱**：编译器自动完成转换。\n\n'
     '基本类型对应包装类：int→Integer, double→Double, char→Character, boolean→Boolean, long→Long',
     ['装箱', '拆箱', '包装类', 'Integer', 'Double', '自动装箱', '自动拆箱']),
    ('深复制 vs 浅复制',
     '**浅复制**（Shallow Copy）：只复制对象的引用，不复制引用的对象。Object类的clone()默认是浅复制。\n'
     '**深复制**（Deep Copy）：复制对象及其引用的所有对象。需要重写clone()方法实现。',
     ['深复制', '浅复制', 'clone', 'Deep Copy', 'Shallow Copy', 'Cloneable']),
    ('不可变类',
     '**不可变类**（Immutable Class）：对象创建后其内容不可修改。\n'
     '例如：String、基本类型的包装类（Integer、Double等）。\n\n'
     '特点：(1) 类声明为final (2) 所有字段private (3) 不提供setter方法 (4) getter不返回可变对象的引用',
     ['不可变类', '不可变对象', 'String', 'final', '包装类']),
    ('final 关键字',
     '**final 修饰变量**：常量，赋值后不可修改。\n'
     '**final 修饰方法**：不能被子类重写（Override）。\n'
     '**final 修饰类**：不能被继承（如String类、Math类）。\n'
     '**final 修饰参数**：方法内不能修改该参数的引用。',
     ['final', '常量', '不可继承', '不可重写']),
    ('UML 类图关系',
     '**UML**（Unified Modeling Language）：统一建模语言。\n\n'
     '类图关系：\n'
     '- **关联**（Association）：实线连接\n'
     '- **聚集**（Aggregation）：空心菱形 + 实线（整体-部分，弱关系）\n'
     '- **组合**（Composition）：实心菱形 + 实线（整体-部分，强关系）\n'
     '- **继承**（Inheritance）：空心三角 + 实线指向父类\n'
     '- **实现**（Realization）：空心三角 + 虚线指向接口',
     ['UML', '类图', '关联', '聚集', '组合', '继承', '实现']),
    ('instanceof 运算符',
     '**instanceof**：判断一个对象是否是某个类（或接口）的实例。\n\n'
     '`obj instanceof ClassName` 返回 true 或 false。\n\n'
     '常用于向下转型前的安全检查：\n'
     '`if (obj instanceof Dog) { Dog d = (Dog) obj; }`',
     ['instanceof', '类型判断', '向下转型', '类型转换']),
    ('标记接口（Marker Interface）',
     '**标记接口**：没有任何方法的接口。\n'
     '例如：**Cloneable**（可克隆）、**Serializable**（可序列化）。\n\n'
     '作用：标记一个类具有某种能力，JVM会据此做特殊处理。',
     ['标记接口', 'Marker Interface', 'Cloneable', 'Serializable']),
    ('动态绑定',
     '**动态绑定**（Dynamic Binding）：运行时根据对象的实际类型决定调用哪个方法。\n\n'
     '前提：(1) 存在继承关系 (2) 子类重写了父类方法 (3) 父类引用指向子类对象\n\n'
     '`Animal a = new Dog();`\n'
     '`a.speak();` // 编译看Animal，运行看Dog → 调用Dog的speak()',
     ['动态绑定', '多态', '运行时', '向上转型']),
    ('构造方法',
     '**构造方法**特点：\n'
     '1. 方法名与类名完全相同\n'
     '2. 没有返回值类型（不是void！）\n'
     '3. 用 new 关键字调用，用于初始化对象\n'
     '4. 如果不写，编译器自动提供默认无参构造方法\n'
     '5. 可以重载（多个不同参数的构造方法）\n'
     '6. **构造方法链**：子类构造方法第一条语句自动调用父类构造方法 super()',
     ['构造方法', '构造方法链', 'super', 'new', '重载', '默认构造方法']),
    ('静态成员（static）',
     '**静态变量**：属于类本身，所有实例共享同一份数据。\n'
     '**静态方法**：属于类本身，可直接用类名调用（如 Math.sqrt()）。\n\n'
     '限制：(1) 静态方法不能访问实例变量/实例方法 (2) 静态方法中不能使用 this/super\n'
     '(3) 实例方法可以自由访问静态成员',
     ['static', '静态变量', '静态方法', '类变量', '实例变量']),
    ('String 类常用操作',
     '| 方法 | 说明 |\n|------|------|\n'
     '| length() | 获取字符数 |\n'
     '| charAt(i) | 获取第i个字符 |\n'
     '| substring(i,j) | 截取子串 [i, j) |\n'
     '| equals(s) | 比较内容是否相等 |\n'
     '| concat(s) / + | 连接字符串 |\n'
     '| indexOf(s) | 查找子串位置 |\n\n'
     '**重要**：String是不可变类，== 比较引用地址，equals() 比较内容。'
     ' `"Hello" == "Hello"` 为true（常量池），`new String("Hello") == new String("Hello")` 为false。',
     ['String', 'length', 'substring', 'equals', 'concat', '字符串常量池']),
    ('ArrayList 与泛型',
     '**ArrayList** 是动态数组，位于 java.util 包。\n\n'
     '常用方法：add(e)、get(i)、size()、remove(i)、contains(e)、indexOf(e)\n\n'
     '**泛型**：`ArrayList<String>` 指定元素类型。\n'
     '**注意**：不能使用基本类型作为泛型参数（如 `ArrayList<int>` 错误），需用包装类 `ArrayList<Integer>`。',
     ['ArrayList', '泛型', '集合', '动态数组', 'java.util']),
    ('值传递与引用传递',
     '**Java中只有值传递**。\n\n'
     '- **基本类型参数**：传递值的副本，方法内修改不影响原变量。\n'
     '- **引用类型参数**：传递引用的副本（指向同一对象），修改对象属性会影响原对象，但修改引用本身不影响。\n\n'
     '**程序阅读题高频考点**：数组传递、自定义类对象传递。',
     ['值传递', '引用传递', '参数传递', '数组传递']),
]

for i, (title, content, terms) in enumerate(glossary_items):
    add_node(title, content, terms, None, glossary, i, 'medium')

# ===== 三、各章节知识点 =====
chapter_data = {
    '第1章 计算机、程序和Java概述': [
        ('Java语言特点与开发环境', 'Java特点：面向对象、跨平台（Write Once, Run Anywhere）、简单安全多线程。\n\n源代码(.java) 编译(javac) 字节码(.class) JVM解释执行。\n\nJDK包含JRE（运行环境）和开发工具（javac编译器、java解释器）。',
         ['Java特点', '跨平台', '字节码', 'javac', 'java', 'JVM']),
        ('第一个Java程序结构', '```java\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}\n```\n\n- 一个源文件只能有一个public类，且类名必须与文件名相同\n- main方法是程序入口：public static void main(String[] args)\n- System.out 是标准输出流',
         ['HelloWorld', 'main方法', 'System.out', 'public class']),
    ],
    '第2章 基本程序设计': [
        ('基本数据类型与默认值', '| 类型 | 字节 | 默认值 |\n|------|------|--------|\n| byte | 1 | 0 |\n| short | 2 | 0 |\n| int | 4 | 0 |\n| long | 8 | 0L |\n| float | 4 | 0.0f |\n| double | 8 | 0.0d |\n| char | 2 | \\'\\\\u0000\\' |\n| boolean | - | false |\n\n引用类型（String等）默认值为 **null**。',
         ['基本数据类型', 'int', 'double', 'char', 'boolean', '默认值', 'null']),
        ('Scanner 控制台输入', '```java\nimport java.util.Scanner;\nScanner input = new Scanner(System.in);\nint n = input.nextInt();      // 读取整数\nString s = input.nextLine();   // 读取一行\n```\n\n**坑**：nextInt()后紧跟nextLine()会读到空行，需额外调用一次nextLine()消耗换行符。',
         ['Scanner', '输入', '控制台', 'System.in', 'nextLine']),
        ('命名规范与标识符', '标识符规则：字母/下划线/$开头，后续可包含数字。不能是关键字。\n\n命名规范：\n- 类名：大驼峰（PascalCase）如 StudentInfo\n- 方法/变量：小驼峰（camelCase）如 studentName\n- 常量：全大写+下划线 如 MAX_VALUE',
         ['标识符', '命名规范', '关键字', '驼峰命名']),
    ],
    '第3章 选择': [
        ('if-else 与 switch', '```java\n// if-else\nif (score >= 90) { grade = "A"; }\nelse if (score >= 80) { grade = "B"; }\nelse { grade = "C"; }\n\n// switch（支持int/String/char/enum）\nswitch (day) {\n    case 1: System.out.println("Mon"); break;\n    case 2: System.out.println("Tue"); break;\n    default: System.out.println("Other");\n}\n```\n\n**注意**：忘记break会导致case穿透。',
         ['if-else', 'switch', 'break', '条件判断']),
    ],
    '第4章 数学函数、字符和字符串': [
        ('Math 类常用方法', '| 方法 | 说明 |\n|------|------|\n| Math.sqrt(x) | 平方根 |\n| Math.pow(a,b) | a^b |\n| Math.abs(x) | 绝对值 |\n| Math.max(a,b) / min | 最大/最小值 |\n| Math.random() | [0, 1) 随机数 |\n| Math.round(x) | 四舍五入 |\n| Math.PI / Math.E | 常量 |\n\n所有方法都是static，直接用类名调用。',
         ['Math', 'sqrt', 'pow', 'random', 'static']),
    ],
    '第5章 循环': [
        ('循环结构', '```java\n// for 循环\nfor (int i = 0; i < 10; i++) { ... }\n\n// while 循环\nwhile (condition) { ... }\n\n// do-while（至少执行一次）\ndo { ... } while (condition);\n\n// 增强for（foreach）\nfor (int x : array) { ... }\n```\n\n**break**：跳出整个循环。**continue**：跳过当前迭代。',
         ['for', 'while', 'do-while', 'foreach', 'break', 'continue']),
    ],
    '第6章 方法': [
        ('方法定义与调用', '```java\n// 方法定义\npublic static int max(int a, int b) {\n    return (a > b) ? a : b;\n}\n\n// 调用\nint result = max(5, 10);\n```\n\n- **方法签名**：方法名 + 参数列表（不含返回类型）\n- **方法重载**：同一类中同名方法，参数列表不同（数量/类型/顺序不同）\n- 返回类型不是方法签名的一部分',
         ['方法', '方法签名', '参数', '返回值', '重载条件']),
    ],
    '第7章 一维数组': [
        ('数组基础', '```java\n// 声明与创建\nint[] a = new int[10];         // 默认值0\nint[] b = {1, 2, 3, 4, 5};    // 直接初始化\n\n// 遍历\nfor (int i = 0; i < a.length; i++) { a[i] = i; }\nfor (int x : a) { System.out.println(x); }  // 增强for\n```\n\n- 数组是对象，length是属性（不是方法）\n- 访问越界抛 **ArrayIndexOutOfBoundsException**\n- 数组引用赋值是**浅复制**',
         ['数组', 'length', 'ArrayIndexOutOfBoundsException', 'foreach', 'new']),
    ],
    '第8章 多维数组': [
        ('二维数组', '```java\nint[][] matrix = new int[3][4];  // 3行4列\nint[][] jagged = {{1,2}, {3,4,5}}; // 锯齿数组\n\nmatrix.length    // 行数 = 3\nmatrix[0].length // 列数 = 4\n```\n\n**考试重点**：二维数组的引用交换操作（程序阅读题）。',
         ['二维数组', '多维数组', '锯齿数组', 'matrix']),
    ],
    '第9章 对象和类': [
        ('类的定义与封装', '```java\npublic class Student {\n    private String name;      // 私有数据域\n    private int age;\n\n    public Student(String name, int age) {  // 构造方法\n        this.name = name;\n        this.age = age;\n    }\n    public String getName() { return name; }   // getter\n    public void setAge(int age) { this.age = age; } // setter\n}\n```\n\n**封装**：private字段 + public getter/setter。',
         ['类', '对象', '构造方法', 'getter', 'setter', '封装', 'private']),
    ],
    '第10章 面向对象思想': [
        ('String 深度解析', '**创建方式**：\n- `String a = "Hello";` 从字符串常量池取\n- `String b = new String("Hello");` 在堆中新建对象\n\n**比较**：\n- `==` 比较引用地址\n- `equals()` 比较内容\n\n**经典考题**：\n```java\nString c = "Hello", d = "Hello";\nSystem.out.println(c == d);      // true（常量池）\nString a = new String("Hello"), b = new String("Hello");\nSystem.out.println(a == b);      // false（堆中不同对象）\n```',
         ['String', '字符串常量池', '==', 'equals', 'new String']),
    ],
    '第11章 继承和多态': [
        ('继承体系', '```java\nclass Animal {\n    public Animal() { System.out.println("Animal()"); }\n}\nclass Dog extends Animal {\n    public Dog() {\n        super();  // 隐式调用父类构造\n        System.out.println("Dog()");\n    }\n}\n// new Dog() 输出：Animal() → Dog()\n```\n\n- Java只支持**单继承**（一个类只能extends一个父类）\n- 所有类的根是 **Object**\n- 子类构造方法第一条语句必须是super()或this()',
         ['继承', 'extends', 'super', '构造方法链', 'Object', '单继承']),
        ('多态与动态绑定', '**多态三条件**：(1) 继承 (2) 重写 (3) 父类引用指向子类对象。\n\n```java\nAnimal a = new Dog();  // 向上转型（自动）\n// a的编译类型=Animal，运行类型=Dog\na.speak();  // 动态绑定 → 调用Dog的speak()\n\nif (a instanceof Dog) {\n    Dog d = (Dog) a;  // 向下转型（强制）\n}\n```\n\n**程序阅读题必考点**：方法调用看运行类型，字段访问看编译类型。',
         ['多态', '向上转型', '向下转型', '动态绑定', 'instanceof', '@Override']),
    ],
    '第12章 异常处理和文本I/O': [
        ('异常处理机制', '```java\ntry {\n    int[] a = {1,2,3};\n    System.out.println(a[5]);\n} catch (ArrayIndexOutOfBoundsException e) {\n    System.out.println("越界");\n} catch (Exception e) {\n    System.out.println("其他");\n} finally {\n    System.out.println("始终执行");\n}\n```\n\n- 子类异常catch块必须在父类异常catch块前面\n- finally块始终执行（即使有return）\n- **异常传播**：方法调用栈逐层向上抛，直到被catch或程序终止',
         ['异常', 'try-catch', 'finally', '异常传播', 'ArrayIndexOutOfBoundsException', 'NullPointerException']),
    ],
    '第13章 抽象类和接口': [
        ('抽象类', '```java\nabstract class Shape {\n    protected String color;\n    public abstract double getArea();  // 抽象方法无方法体\n    public String getColor() { return color; }  // 具体方法\n}\n```\n\n- abstract类不能被new实例化\n- 可以有构造方法（供子类super调用）\n- 子类必须实现所有抽象方法，否则子类也必须是abstract',
         ['抽象类', 'abstract', '抽象方法']),
        ('接口与多实现', '```java\ninterface Attackable {\n    void attack();  // 默认 public abstract\n}\nclass Warrior implements Attackable {\n    public void attack() { /* 实现 */ }\n}\n```\n\n- 接口中所有方法默认 public abstract，所有变量默认 public static final\n- 一个类可以实现**多个接口**（Java多实现的唯一方式）\n- 接口可以继承接口（extends）\n- **接口回调/多态**：接口类型变量可以引用其实现类对象',
         ['接口', 'interface', 'implements', '多实现', '接口回调']),
        ('Comparable 接口与排序', '```java\nclass Student implements Comparable<Student> {\n    private double score;\n    @Override\n    public int compareTo(Student other) {\n        return Double.compare(this.score, other.score);\n    }\n}\n// 使用：Collections.sort(list);\n```\n\n- compareTo返回：负数(<)、0(=)、正数(>)\n- Arrays.sort() 对数组排序，Collections.sort() 对List排序',
         ['Comparable', 'compareTo', '排序', 'Collections.sort', 'Arrays.sort']),
    ],
}

for ch_name, nodes in chapter_data.items():
    for i, (title, content, terms) in enumerate(nodes):
        add_node(title, content, terms, ch_name, None, i, 'medium')

db.commit()
total = db.query(KnowledgeNode).filter(KnowledgeNode.subject_id == 4).count()
print(f"Done! Inserted {total} knowledge nodes for Java subject.")
db.close()
