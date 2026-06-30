# -*- coding: utf-8 -*-
"""Seed Java knowledge nodes from exam review PDF data."""
from database import SessionLocal
from models import KnowledgeNode, Subject, Chapter

db = SessionLocal()
subj = db.query(Subject).filter(Subject.id == 4).first()
chapters = {ch.name: ch.id for ch in db.query(Chapter).filter(Chapter.subject_id == 4).all()}
db.query(KnowledgeNode).filter(KnowledgeNode.subject_id == 4).delete()

def add(title, content, terms, ch=None, pid=None, order=0, diff='medium'):
    n = KnowledgeNode(subject_id=4, chapter_id=chapters.get(ch), parent_id=pid,
        title=title, content=content, key_terms=terms, order=order,
        difficulty=diff, source='复习&模拟卷PDF')
    db.add(n); db.flush(); return n.id

# -- Exam Guide --
g = add('考试指南', '', [], None, None, 0, 'easy')
add('考试范围',
    '### 考试范围：第1-13章\n\n'
    '以下小节**不考**：\n\n'
    '| 章节 | 不考内容 |\n|------|----------|\n'
    '| 2.17 | 软件开发过程 |\n| 6.11 | 方法抽象和逐步求精 |\n'
    '| 7.9 | 可变长参数列表 |\n| 10.9 | BigInteger和BigDecimal |\n'
    '| 10.10.3-4 | 字符串相关(部分) |\n| 10.10.6 | 字符串相关(部分) |\n'
    '| 10.11 | StringBuilder |\n| 12.10-12.13 | 文件相关 |\n'
    '| 13.10 | 类的设计原则 |\n\n'
    '**其余内容均在考试范围内。**',
    ['考试范围','不考章节'], None, g, 0, 'easy')
add('题型说明',
    '### 考试共5种题型\n\n'
    '| 题型 | 题量 | 考察方式 |\n|------|------|----------|\n'
    '| 一、选择题 | 20道 | 对基本概念的全面考察 |\n'
    '| 二、填空题 | 17道 | 关键术语和核心概念 |\n'
    '| 三、简答题 | 10道 | 概念解释和简要说明 |\n'
    '| 四、程序阅读题 | 8道 | 阅读代码写出运行结果 |\n'
    '| 五、程序设计题 | 5道 | 编写完整程序 |\n\n'
    '### 各题型复习重点\n'
    '- 选择题/填空题：覆盖范围广，重点复习关键术语和Java语法规则\n'
    '- 程序阅读题：重点考察继承、多态、异常处理、值传递\n'
    '- 程序设计题：重点考察类定义、接口实现、异常自定义、UML类图',
    ['选择题','填空题','简答题','程序阅读题','程序设计题'], None, g, 1, 'easy')
add('复习建议',
    '### 建议复习路径\n\n'
    '1. 通读教材，重点关注每章后面的关键术语和本章小结\n'
    '2. 做教材各章节习题、课后编程题\n'
    '3. 看14讲PPT课件，覆盖全部考点\n'
    '4. 刷模拟卷了解出题风格\n'
    '5. 重点突破：继承多态、抽象类接口、异常处理是高频考点\n\n'
    '### 参考资料\n'
    '- 教材各章节课后习题\n'
    '- 头歌平台作业和实验\n'
    '- 14讲PPT课件',
    ['复习方法','教材','PPT','习题'], None, g, 2, 'easy')

# -- Glossary --
gl = add('核心术语速查', '', [], None, None, 1, 'medium')
terms = [
    ('JDK、JRE、JVM',
     '**JDK**(Java Development Kit)：Java开发工具包，包含编译器javac、JRE等。\n'
     '**JRE**(Java Runtime Environment)：Java运行环境，包含JVM和核心类库。\n'
     '**JVM**(Java Virtual Machine)：Java虚拟机，执行字节码(.class文件)。',
     ['JDK','JRE','JVM','编译器','虚拟机']),
    ('面向对象三大支柱',
     '**封装**(Encapsulation)：隐藏内部实现细节，通过public方法暴露接口。\n'
     '**继承**(Inheritance)：子类继承父类的属性和方法，实现代码复用。\n'
     '**多态**(Polymorphism)：同一方法调用在不同对象上表现出不同行为。',
     ['封装','继承','多态','面向对象']),
    ('抽象类 vs 接口',
     '**抽象类**(abstract class)：不能被实例化，可以有构造方法、实例变量和具体方法。\n'
     '**接口**(interface)：全部方法默认public abstract，全部变量默认public static final。\n'
     '一个类只能继承一个抽象类，但可以实现多个接口。',
     ['抽象类','接口','abstract','interface','extends','implements']),
    ('重载(Overload) vs 重写(Override)',
     '**重载**：同一类中同名方法，参数列表不同(数量/类型/顺序)。编译时多态。\n'
     '**重写**：子类重新定义父类方法，方法签名完全相同。运行时多态(动态绑定)。\n'
     '**注意**：static方法不能被重写，构造方法不能被重写。',
     ['重载','重写','Override','Overload','动态绑定']),
    ('super vs this 关键字',
     '**this**：引用当前对象。用法：(1)访问实例变量 (2)调用其他构造方法this(...)\n'
     '**super**：引用父类对象。用法：(1)调用父类构造super(...)必须是第一条语句 (2)访问被覆盖的方法super.method()',
     ['super','this','关键字','构造方法']),
    ('可见性修饰符',
     '从小到大：\n'
     '1. **private**：仅同类可见\n'
     '2. **默认**(无修饰符)：同包可见\n'
     '3. **protected**：同包+子类可见\n'
     '4. **public**：所有类可见',
     ['private','默认','protected','public','可见性','修饰符']),
    ('异常体系',
     '**Throwable**\n'
     '- **Error**：严重错误，程序无法处理\n'
     '- **Exception**\n'
     '  - RuntimeException(免检异常)：NullPointerException, ArrayIndexOutOfBoundsException, ArithmeticException, IndexOutOfBoundsException, IllegalArgumentException\n'
     '  - 必检异常(Checked)：IOException等，必须try-catch或throws声明',
     ['异常','Exception','Error','RuntimeException','免检异常','必检异常','try-catch']),
    ('装箱与拆箱',
     '**装箱**(Boxing)：基本类型->包装类对象。如 int->Integer\n'
     '**拆箱**(Unboxing)：包装类对象->基本类型。如 Integer->int\n'
     '**自动装箱/拆箱**：编译器自动完成。\n\n'
     '基本类型对应包装类：int->Integer, double->Double, char->Character, boolean->Boolean, long->Long',
     ['装箱','拆箱','包装类','Integer','Double','自动装箱']),
    ('深复制 vs 浅复制',
     '**浅复制**(Shallow Copy)：只复制对象的引用，不复制引用的对象。Object.clone()默认浅复制。\n'
     '**深复制**(Deep Copy)：复制对象及其引用的所有对象。需重写clone()方法实现。',
     ['深复制','浅复制','clone','Deep Copy','Shallow Copy','Cloneable']),
    ('不可变类',
     '**不可变类**(Immutable Class)：对象创建后其内容不可修改。\n'
     '例如：String、基本类型的包装类(Integer、Double等)。\n\n'
     '特点：(1)类声明为final (2)所有字段private (3)不提供setter (4)getter不返回可变对象引用',
     ['不可变类','不可变对象','String','final']),
    ('final 关键字',
     '**final修饰变量**：常量，赋值后不可修改。\n'
     '**final修饰方法**：不能被子类重写。\n'
     '**final修饰类**：不能被继承(如String类、Math类)。\n'
     '**final修饰参数**：方法内不能修改参数引用。',
     ['final','常量','不可继承','不可重写']),
    ('UML 类图关系',
     '**UML**(Unified Modeling Language)：统一建模语言。\n\n'
     '类图关系表示：\n'
     '- 关联(Association)：实线连接\n'
     '- 聚集(Aggregation)：空心菱形+实线(整体-部分，弱)\n'
     '- 组合(Composition)：实心菱形+实线(整体-部分，强)\n'
     '- 继承(Inheritance)：空心三角+实线->父类\n'
     '- 实现(Realization)：空心三角+虚线->接口',
     ['UML','类图','关联','聚集','组合','继承','实现']),
    ('instanceof 运算符',
     '**instanceof**：判断对象是否是某个类(或接口)的实例。\n\n'
     'obj instanceof ClassName 返回 true/false。\n\n'
     '常用于向下转型前的安全检查：if(obj instanceof Dog){ Dog d=(Dog)obj; }',
     ['instanceof','类型判断','向下转型']),
    ('标记接口(Marker Interface)',
     '**标记接口**：没有任何方法的接口。\n'
     '例如：Cloneable(可克隆)、Serializable(可序列化)。\n\n'
     '作用：标记一个类具有某种能力，JVM据此做特殊处理。',
     ['标记接口','Marker Interface','Cloneable','Serializable']),
    ('动态绑定',
     '**动态绑定**(Dynamic Binding)：运行时根据对象的实际类型决定调用哪个方法。\n\n'
     '前提：(1)存在继承 (2)子类重写父类方法 (3)父类引用指向子类对象\n\n'
     'Animal a = new Dog(); a.speak(); // 编译看Animal，运行看Dog',
     ['动态绑定','多态','运行时','向上转型']),
    ('构造方法',
     '**构造方法**特点：\n'
     '1. 方法名与类名完全相同\n'
     '2. 没有返回值类型(不是void!)\n'
     '3. 用new关键字调用，初始化对象\n'
     '4. 不写则编译器提供默认无参构造方法\n'
     '5. 可以重载(多个不同参数的构造方法)\n'
     '6. 构造方法链：子类第一条语句自动调用super()',
     ['构造方法','构造方法链','super','new','默认构造方法']),
    ('静态成员(static)',
     '**静态变量**：属于类本身，所有实例共享。\n'
     '**静态方法**：属于类本身，用类名直接调用(如Math.sqrt())。\n\n'
     '限制：(1)静态方法不能访问实例变量/方法 (2)静态方法不能使用this/super (3)实例方法可自由访问静态成员',
     ['static','静态变量','静态方法','类变量']),
    ('String 类与字符串常量池',
     '常用方法：length(), charAt(i), substring(i,j), equals(s), concat(s)/+, indexOf(s)\n\n'
     '**重要**：String是不可变类。==比较引用地址，equals()比较内容。\n'
     'Hello==Hello为true(常量池)，new String(Hello)==new String(Hello)为false(堆中不同对象)。',
     ['String','length','substring','equals','concat','字符串常量池']),
    ('ArrayList 与泛型',
     '**ArrayList**是动态数组，位于java.util包。\n'
     '常用方法：add(e), get(i), size(), remove(i), contains(e), indexOf(e)\n\n'
     '**泛型**：ArrayList<String>指定元素类型。\n'
     '**注意**：不能用基本类型如ArrayList<int>，需用ArrayList<Integer>。',
     ['ArrayList','泛型','集合','动态数组','java.util']),
    ('值传递与引用传递',
     '**Java中只有值传递**。\n'
     '- 基本类型参数：传递值的副本，方法内修改不影响原变量。\n'
     '- 引用类型参数：传递引用的副本(指向同一对象)，修改对象属性影响原对象，但修改引用本身不影响。\n\n'
     '**程序阅读题高频考点**：数组传递、自定义类对象传递。',
     ['值传递','引用传递','参数传递','数组传递']),
]
for i, (t, c, k) in enumerate(terms):
    add(t, c, k, None, gl, i, 'medium')

# -- Chapter Knowledge --
ch_data = {
    '第1章 计算机、程序和Java概述': [
        ('Java语言特点与开发环境',
         'Java特点：面向对象、跨平台(Write Once, Run Anywhere)、简单安全多线程。\n\n'
         '源文件(.java) 编译(javac) 字节码(.class) JVM解释执行。\n'
         'JDK包含JRE和开发工具(javac, java, jar等)。',
         ['Java特点','跨平台','字节码','javac','java','JVM']),
        ('第一个Java程序结构',
         'public class Hello { public static void main(String[] args) { System.out.println("Hello"); } }\n\n'
         '- 一个源文件只能有一个public类，类名须与文件名相同\n'
         '- main方法是程序入口：public static void main(String[] args)\n'
         '- System.out是标准输出流',
         ['HelloWorld','main方法','System.out','public class']),
    ],
    '第2章 基本程序设计': [
        ('基本数据类型与默认值',
         '| 类型 | 字节 | 默认值 |\n|------|------|--------|\n'
         '| byte | 1 | 0 |\n| short | 2 | 0 |\n| int | 4 | 0 |\n'
         '| long | 8 | 0L |\n| float | 4 | 0.0f |\n| double | 8 | 0.0d |\n'
         '| char | 2 | u0000 |\n| boolean | - | false |\n\n'
         '引用类型(如String)默认值为**null**。',
         ['基本数据类型','int','double','char','boolean','默认值','null']),
        ('Scanner 控制台输入',
         'import java.util.Scanner;\nScanner input = new Scanner(System.in);\n'
         'int n = input.nextInt(); // 读取整数\n'
         'String s = input.nextLine(); // 读取一行\n\n'
         '注意：nextInt()后直接nextLine()会读到空行，需额外调用一次nextLine()消耗换行符。',
         ['Scanner','输入','控制台','System.in','nextLine']),
    ],
    '第9章 对象和类': [
        ('类的定义与封装',
         'public class Student {\n'
         '  private String name; // 私有数据域\n'
         '  private int age;\n'
         '  public Student(String name, int age) { this.name = name; this.age = age; }\n'
         '  public String getName() { return name; } // getter(访问器)\n'
         '  public void setAge(int age) { this.age = age; } // setter(修改器)\n'
         '}\n\n'
         '封装：private字段 + public getter/setter。',
         ['类','对象','构造方法','getter','setter','封装','private']),
    ],
    '第11章 继承和多态': [
        ('继承基础',
         'class Animal { public Animal() {...} }\n'
         'class Dog extends Animal { public Dog() { super(); ... } }\n'
         '// new Dog() 先调用Animal()再调用Dog()，输出: Animal() Dog()\n\n'
         '- Java只支持单继承(一个类只能extends一个父类)\n'
         '- 所有类的根是Object\n'
         '- 子类构造方法首条必须是super()或this()',
         ['继承','extends','super','构造方法链','Object','单继承']),
        ('多态与动态绑定',
         '多态三条件：(1)继承 (2)重写 (3)父类引用指向子类对象\n\n'
         'Animal a = new Dog(); // 向上转型(自动)\n'
         'a.speak(); // 动态绑定: 调用Dog的speak()\n'
         'if(a instanceof Dog) { Dog d = (Dog)a; } // 向下转型(强制)\n\n'
         '程序阅读题必考点：方法调用看运行类型，字段访问看编译类型。',
         ['多态','向上转型','向下转型','动态绑定','instanceof','@Override']),
    ],
    '第12章 异常处理和文本I/O': [
        ('异常处理机制',
         'try {\n'
         '  int[] a = {1,2,3}; System.out.println(a[5]);\n'
         '} catch(ArrayIndexOutOfBoundsException e) {\n'
         '  System.out.println("越界");\n'
         '} catch(Exception e) {\n'
         '  System.out.println("其他");\n'
         '} finally { System.out.println("始终执行"); }\n\n'
         '- 子类异常catch必须在父类异常catch前面\n'
         '- finally块始终执行(即使有return)\n'
         '- 异常传播：方法调用栈逐层向上抛',
         ['异常','try-catch','finally','异常传播','ArrayIndexOutOfBoundsException','NullPointerException']),
    ],
    '第13章 抽象类和接口': [
        ('抽象类',
         'abstract class Shape {\n'
         '  protected String color;\n'
         '  public abstract double getArea(); // 抽象方法无方法体\n'
         '  public String getColor() { return color; } // 具体方法\n'
         '}\n\n'
         '- abstract类不能被new实例化\n'
         '- 可以有构造方法(供子类super调用)\n'
         '- 子类必须实现所有抽象方法，否则子类也必须是abstract',
         ['抽象类','abstract','抽象方法']),
        ('接口与多实现',
         'interface Attackable { void attack(); } // 默认public abstract\n'
         'class Warrior implements Attackable {\n'
         '  public void attack() { /* 实现 */ }\n'
         '}\n\n'
         '- 接口中所有方法默认public abstract，所有变量默认public static final\n'
         '- 一个类可以实现多个接口(Java多实现的唯一方式)\n'
         '- 接口可以继承接口(extends)\n'
         '- 接口回调/多态：接口类型变量可引用其实现类对象',
         ['接口','interface','implements','多实现','接口回调']),
        ('Comparable 接口与排序',
         'class Student implements Comparable<Student> {\n'
         '  private double score;\n'
         '  @Override public int compareTo(Student other) {\n'
         '    return Double.compare(this.score, other.score);\n'
         '  }\n'
         '}\n\n'
         '- compareTo返回：负数(<), 0(=), 正数(>)\n'
         '- Arrays.sort()对数组排序，Collections.sort()对List排序',
         ['Comparable','compareTo','排序','Collections.sort','Arrays.sort']),
    ],
}
for ch_name, nodes in ch_data.items():
    for i, (title, content, terms) in enumerate(nodes):
        add(title, content, terms, ch_name, None, i, 'medium')

db.commit()
total = db.query(KnowledgeNode).filter(KnowledgeNode.subject_id == 4).count()
print(f"Done! Total knowledge nodes: {total}")
db.close()
