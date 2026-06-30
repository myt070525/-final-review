# -*- coding: utf-8 -*-
"""Import actual exam questions from the PDF mock exam into the question bank."""
from database import SessionLocal
from models import Question, Subject, Chapter

db = SessionLocal()
subject = db.query(Subject).filter(Subject.id == 4).first()
chapters = {ch.name: ch.id for ch in db.query(Chapter).filter(Chapter.subject_id == 4).all()}

def get_ch(name_keyword):
    """Find chapter id by keyword match"""
    for name, cid in chapters.items():
        if name_keyword in name:
            return cid
    return None

# ===== 一、选择题 (20道，来自PDF模拟卷) =====
choices = [
    ("下列关于继承的说法正确的是：",
     ["A. Java语言只支持单继承", "B. 所有的 is-a 关系都应用继承建模", "C. 一个子类与父类之间必然存在 is-a 关系", "D. 子类是父类的一个子集"],
     "C", "choice", "第11章 继承和多态"),
    ("下列哪个不是Java Object类中的方法？",
     ["A. toString", "B. equals", "C. compareTo", "D. clone"],
     "C", "choice", "第11章 继承和多态"),
    ("下列关于静态变量和方法的描述，错误的是：",
     ["A. 静态方法不能访问类的实例成员，实例方法可以访问实例成员", "B. 静态方法一定要在创建一个实例后才可使用静态方法", "C. 实例方法可以调用实例方法和静态方法", "D. 类的静态方法可以通过类名直接调用"],
     "B", "choice", "第9章 对象和类"),
    ("下列关于Java字符串String说法错误的是：",
     ["A. 可以使用concat方法或者+连接字符串", "B. 可以使用运算符==比较两个字符串内容是否相等", "C. 可以使用substring方法从字符串中提取子串", "D. 可以使用字符串的length方法获取字符串长度"],
     "B", "choice", "第4章 数学函数、字符和字符串"),
    ("下列关于抽象类和接口说法错误的是：",
     ["A. 抽象类和接口中均可定义构造方法", "B. 一个类可以实现多个接口", "C. 抽象类和接口均不能创建实例", "D. 接口可以继承其他接口"],
     "A", "choice", "第13章 抽象类和接口"),
    ("设Animal、Tiger定义如下：\nclass Animal{ }\nclass Tiger extends Animal{\n  public void roar(){}\n}\n下列描述错误的是：",
     ["A. Animal t=new Tiger(); t.roar();", "B. Tiger t=new Tiger(); t.roar();", "C. Object t=new Tiger(); ((Tiger)t).roar();", "D. Animal[] list=new Tiger[10];"],
     "A", "choice", "第11章 继承和多态"),
    ("执行以下代码时抛出的异常类型是：\nint a[] = {1,2,3,4,5};\nSystem.out.println(a[5]);",
     ["A. ArithmeticException", "B. IllegalArgumentException", "C. NullPointerException", "D. ArrayIndexOutOfBoundsException"],
     "D", "choice", "第7章 一维数组"),
    ("设MyClass定义如下：\npublic class MyClass{\n  public MyClass(){}\n  public void foo(int x,int y){}\n}\n下面重载方法正确的是：",
     ["A. 重载构造方法：public void MyClass(){}", "B. 重载foo()：public void foo(int a,int b){}", "C. 重载foo()：protected void foo(double a,double b){}", "D. 重载foo()：public void foo(double a,double b){}"],
     "D", "choice", "第6章 方法"),
    ("下列选项中描述错误的是：",
     ["A. Double x=Integer.valueOf(5);", "B. Double x=5.0;", "C. Integer x=3+Integer.valueOf(5);", "D. int x=Integer.valueOf(5);"],
     "A", "choice", "第10章 面向对象思想"),
    ("如图，Student类和Course类之间的关系是：",
     ["A. 关联", "B. 组合", "C. 继承", "D. 聚集"],
     "D", "choice", "第9章 对象和类"),
    ("负责Java源程序编译的命令是：",
     ["A. jdk", "B. java", "C. javac", "D. javad"],
     "C", "choice", "第1章 计算机、程序和Java概述"),
    ("当访问数组元素时下标越界，JVM将抛出的异常是：",
     ["A. NullPointerException", "B. IOException", "C. ArithmeticException", "D. IndexOutOfBoundsException"],
     "D", "choice", "第12章 异常处理和文本I/O"),
    ("下列不属于java.util包的是：",
     ["A. Scanner", "B. Math", "C. Date", "D. ArrayList"],
     "B", "choice", "第1章 计算机、程序和Java概述"),
    ("构造方法与普通方法之间区别描述错误的是：",
     ["A. 构造方法名与类名相同", "B. 如果没有定义构造方法，会有一个默认无参构造方法", "C. 构造方法没有返回值类型", "D. 构造方法在创建对象时由new运算符自动调用，用于初始化对象"],
     "B", "choice", "第9章 对象和类"),
    ("现有下列代码：\n[文件1] package p1; public class C1{...}\n[文件2] package p1; class C2{...}\n[文件3] package p2; public class C3{...}\n下列说法错误的是：",
     ["A. C3可以访问C1", "B. C3可以访问C2", "C. C2可以访问C3", "D. C1可以访问C2"],
     "B", "choice", "第1章 计算机、程序和Java概述"),
    ("已知下列声明：\nString a = new String(\"Hello\");\nString b = new String(\"Hello\");\nString c = \"Hello\";\nString d = \"Hello\";\n下列结果为true的是：",
     ["A. a == b", "B. a == c", "C. c == d", "D. 以上都不对"],
     "C", "choice", "第10章 面向对象思想"),
    ("下列关于装箱和拆箱描述错误的是：",
     ["A. Integer x = 3 + Integer.valueOf(\"5\");", "B. int x = new Integer(3);", "C. double x = Double.valueOf(\"3\");", "D. Double x = 3;"],
     "D", "choice", "第10章 面向对象思想"),
    ("下列不能作为ArrayList的泛型使用的是：",
     ["A. int", "B. String", "C. Comparable", "D. Date"],
     "A", "choice", "第10章 面向对象思想"),
    ("下列不属于免检异常的是：",
     ["A. Error类及其子类", "B. Throwable类及其子类", "C. Exception类及其子类", "D. IOException类及其子类"],
     "D", "choice", "第12章 异常处理和文本I/O"),
    ("下列对接口和抽象类描述正确的是：",
     ["A. 接口用interface定义，抽象类用abstract class定义，二者均没有构造方法", "B. 抽象类可以继承其他抽象类，接口可以继承其他抽象接口", "C. 一个类只能继承一个抽象类，也只能实现一个接口", "D. 抽象类和接口都没有构造方法"],
     "B", "choice", "第13章 抽象类和接口"),
]

for stem, opts, ans, qtype, ch_name in choices:
    ch_id = get_ch(ch_name.split(" ")[0])
    db.add(Question(
        subject_id=4, chapter_id=ch_id, type=qtype,
        stem=stem, options=opts, answer=ans,
        exam_type=None, source_document="PDF模拟卷", is_ai_generated=False,
        difficulty="medium", tags=[]
    ))
print(f"Imported {len(choices)} choice questions")

# ===== 二、填空题 (17道) =====
fills = [
    ("面向对象的三大支柱是____、____和____。", "封装、继承、多态", "fill", "第1章 计算机、程序和Java概述"),
    ("Java语言中可以使用Scanner类的____方法从控制台读取一个int类型的值。", "nextInt()", "fill", "第2章 基本程序设计"),
    ("如果一个类在定义时没有指定继承关系，那么它的父类是____。", "Object", "fill", "第11章 继承和多态"),
    ("没有包含任何方法的接口称为____。", "标记接口", "fill", "第13章 抽象类和接口"),
    ("Object类中的clone方法会复制原始对象中每个数据域给目标对象，这种复制称为____。", "浅复制", "fill", "第9章 对象和类"),
    ("Java语言中的字符串成员默认值为____。", "null", "fill", "第4章 数学函数、字符和字符串"),
    ("一个对象创建后其数据就不能再改变的对象称为____。", "不可变对象", "fill", "第10章 面向对象思想"),
    ("将基本类型值转换为包装类对象的过程称为____。", "装箱", "fill", "第10章 面向对象思想"),
    ("可以使用____运算符判断一个对象是否是某个类的实例。", "instanceof", "fill", "第11章 继承和多态"),
    ("Java使用____表示标准输出。", "System.out", "fill", "第2章 基本程序设计"),
    ("同一个源文件中只能有一个____类，且类名必须和文件名相同。", "public", "fill", "第1章 计算机、程序和Java概述"),
    ("使用____关键字修饰的类不能被继承。", "final", "fill", "第11章 继承和多态"),
    ("一个类中可以有多个名称相同但参数不同的方法，这称为方法的____。", "重载", "fill", "第6章 方法"),
    ("面向对象的三大特性是封装、____和多态。", "继承", "fill", "第11章 继承和多态"),
    ("String类和基本类型的包装类都是____类的典型例子。", "不可变", "fill", "第10章 面向对象思想"),
    ("所有Java类的根类是____。", "Object", "fill", "第11章 继承和多态"),
    ("____关键字用于在子类构造方法中调用父类构造方法。", "super", "fill", "第11章 继承和多态"),
]

for stem, ans, qtype, ch_name in fills:
    ch_id = get_ch(ch_name.split(" ")[0])
    db.add(Question(
        subject_id=4, chapter_id=ch_id, type=qtype,
        stem=stem, options=None, answer=ans,
        exam_type=None, source_document="PDF模拟卷", is_ai_generated=False,
        difficulty="medium", tags=[]
    ))
print(f"Imported {len(fills)} fill questions")

# ===== 三、简答题 (10道) =====
essays = [
    ("不同包中的类，如果使用protected和默认修饰符修饰的方法，子类能否访问？请说明。",
     "protected修饰的方法在不同包的子类中可以访问（通过继承）；默认修饰符（无修饰符）修饰的方法在不同包的子类中不能访问，只能在同一包内访问。"),
    ("final关键字修饰变量、方法和类分别有什么作用？",
     "修饰变量：变量成为常量，赋值后不可修改。修饰方法：方法不能被子类重写（Override）。修饰类：类不能被继承（如String类）。"),
    ("什么是类的组合关系？",
     "组合（Composition）是一种整体-部分的强关联关系，整体对象拥有部分对象的生命周期。在UML中用实心菱形加实线表示。例如：汽车和发动机之间就是组合关系，汽车销毁了发动机也没意义了。"),
    ("哪些属于免检异常类？请举例说明。",
     "免检异常（Unchecked Exception）包括RuntimeException及其子类和Error及其子类。例如：NullPointerException、ArrayIndexOutOfBoundsException、ArithmeticException、IndexOutOfBoundsException、IllegalArgumentException等。"),
    ("什么是多态？",
     "多态（Polymorphism）是指同一操作作用于不同的对象上，可以产生不同的行为。在Java中，多态通过继承（或接口实现）和方法重写实现。父类引用指向子类对象时，调用重写方法会根据实际对象类型执行对应的子类方法（动态绑定）。"),
    ("判断以下代码是否存在错误，如有请说明原因：\nclass Parent { public static void test() {} }\nclass Child extends Parent { public void test() {} }",
     "存在错误。父类Parent中的test()是static方法（类方法），子类Child中试图用实例方法重写静态方法。static方法不能被重写（Override），只能被隐藏（Hide）。如果将子类的test()也声明为static，则不会报错（但这是隐藏而非重写）。"),
    ("按可见性从小到大列出Java的4种访问修饰符。",
     "从小到大：private（仅同类可见）< 默认/无修饰符（同包可见）< protected（同包+子类可见）< public（所有类可见）。"),
    ("什么是标记接口？请举例说明。",
     "标记接口（Marker Interface）是没有任何方法声明的接口。它仅用于标记一个类具有某种能力。例如：Cloneable标记该类可以克隆，Serializable标记该类可以序列化。"),
    ("this关键字有哪两种用法？",
     "1. 引用当前对象的实例变量或方法，区分同名局部变量：this.name = name;\n2. 在当前构造方法中调用本类的其他构造方法：this(参数);"),
    ("什么是动态绑定？",
     "动态绑定（Dynamic Binding）是指方法调用在运行时而非编译时确定。前提条件：(1)存在继承关系 (2)子类重写了父类方法 (3)父类引用指向子类对象。此时调用重写方法，JVM会根据对象的实际类型决定执行哪个版本的方法。"),
]

for stem, ans in essays:
    ch_name = ""
    ch_id = get_ch(ch_name.split(" ")[0]) if "第" in ch_name else None
    db.add(Question(
        subject_id=4, chapter_id=ch_id, type="essay",
        stem=stem, options=None, answer=ans,
        exam_type=None, source_document="PDF模拟卷", is_ai_generated=False,
        difficulty="medium", tags=[]
    ))
print(f"Imported {len(essays)} essay questions")

# ===== 四、程序阅读题 (8道) =====
code_reading = [
    ("阅读以下代码，写出运行结果：\n"
     "public class Test {\n"
     "    public static void change(int x, int[] arr, String s, Integer n, MyObj obj) {\n"
     "        x = 100;\n"
     "        arr[0] = 100;\n"
     "        s = \"Changed\";\n"
     "        n = 200;\n"
     "        obj.value = 100;\n"
     "    }\n"
     "    public static void main(String[] args) {\n"
     "        int a = 10;\n"
     "        int[] b = {10};\n"
     "        String c = \"Original\";\n"
     "        Integer d = 10;\n"
     "        MyObj e = new MyObj(); e.value = 10;\n"
     "        change(a, b, c, d, e);\n"
     "        System.out.println(a + \",\" + b[0] + \",\" + c + \",\" + d + \",\" + e.value);\n"
     "    }\n"
     "}\n"
     "class MyObj { int value; }",
     "10,100,Original,10,100", "code_reading", "第6章 方法"),
    ("阅读以下代码，写出运行结果：\n"
     "class Person {\n"
     "    static int countOfPerson = 0;\n"
     "    String name;\n"
     "    Person(String name) { this.name = name; countOfPerson++; }\n"
     "}\n"
     "class Student extends Person {\n"
     "    Student(String name) { super(name); }\n"
     "}\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        Person p = new Person(\"A\");\n"
     "        Student s = new Student(\"B\");\n"
     "        System.out.println(Person.countOfPerson);\n"
     "    }\n"
     "}",
     "2", "code_reading", "第11章 继承和多态"),
    ("阅读以下代码，写出运行结果：\n"
     "interface Gamable { int play(); }\n"
     "class Game implements Gamable, Comparable<Game> {\n"
     "    int score;\n"
     "    Game(int s) { score = s; }\n"
     "    public int play() { return score; }\n"
     "    public int compareTo(Game o) { return Integer.compare(this.score, o.score); }\n"
     "    public String toString() { return \"\" + score; }\n"
     "}\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        java.util.ArrayList<Game> list = new java.util.ArrayList<>();\n"
     "        list.add(new Game(80)); list.add(new Game(95)); list.add(new Game(65));\n"
     "        java.util.Collections.sort(list);\n"
     "        for (Game g : list) System.out.print(g + \" \");\n"
     "    }\n"
     "}",
     "65 80 95", "code_reading", "第13章 抽象类和接口"),
    ("阅读以下代码，写出运行结果：\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        int a = 10;\n"
     "        System.out.println(a++ + \",\" + ++a);\n"
     "    }\n"
     "}",
     "10,12", "code_reading", "第2章 基本程序设计"),
    ("阅读以下代码，写出运行结果：\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        int[][] a = {{1,2},{3,4}};\n"
     "        int[][] b = {{5,6},{7,8}};\n"
     "        int[] temp = a[0];\n"
     "        a[0] = b[0];\n"
     "        b[0] = temp;\n"
     "        System.out.println(a[0][0] + \",\" + a[0][1] + \",\" + b[0][0] + \",\" + b[0][1]);\n"
     "    }\n"
     "}",
     "5,6,1,2", "code_reading", "第8章 多维数组"),
    ("阅读以下代码，写出运行结果：\n"
     "class A {\n"
     "    public String toString() { return \"A\"; }\n"
     "}\n"
     "class B extends A {\n"
     "    public String toString() { return \"B\"; }\n"
     "}\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        A[] arr = {new A(), new B(), new A()};\n"
     "        for (A a : arr) System.out.print(a + \" \");\n"
     "    }\n"
     "}",
     "A B A", "code_reading", "第11章 继承和多态"),
    ("阅读以下代码，写出运行结果：\n"
     "class Student implements Comparable<Student> {\n"
     "    String name; int score;\n"
     "    Student(String n, int s) { name = n; score = s; }\n"
     "    public int compareTo(Student o) { return Integer.compare(this.score, o.score); }\n"
     "    public String toString() { return name + \":\" + score; }\n"
     "}\n"
     "public class Test {\n"
     "    public static void main(String[] args) {\n"
     "        Student[] arr = {new Student(\"A\",85), new Student(\"B\",72), new Student(\"C\",93)};\n"
     "        java.util.Arrays.sort(arr);\n"
     "        for (Student s : arr) System.out.print(s + \" \");\n"
     "    }\n"
     "}",
     "B:72 A:85 C:93", "code_reading", "第13章 抽象类和接口"),
    ("阅读以下代码，说明异常处理的结果：\n"
     "public class Test {\n"
     "    public static int method() {\n"
     "        try {\n"
     "            int[] a = {1,2,3};\n"
     "            System.out.println(a[5]);\n"
     "            return 1;\n"
     "        } catch (ArrayIndexOutOfBoundsException e) {\n"
     "            System.out.println(\"Caught\");\n"
     "            return 2;\n"
     "        } finally {\n"
     "            System.out.println(\"Finally\");\n"
     "        }\n"
     "    }\n"
     "    public static void main(String[] args) {\n"
     "        System.out.println(method());\n"
     "    }\n"
     "}",
     "Caught\nFinally\n2", "code_reading", "第12章 异常处理和文本I/O"),
]

for stem, ans, ex_type, ch_name in code_reading:
    ch_id = get_ch(ch_name.split(" ")[0])
    db.add(Question(
        subject_id=4, chapter_id=ch_id, type="essay",
        stem=stem, options=None, answer=ans,
        exam_type=ex_type, source_document="PDF模拟卷", is_ai_generated=False,
        difficulty="medium", tags=[]
    ))
print(f"Imported {len(code_reading)} code reading questions")

# ===== 五、程序设计题 (5道) =====
code_design = [
    ("定义一个House类，包含以下私有数据域：\n"
     "int id（编号）、String address（地址）、double area（面积）、double price（单价）\n"
     "要求：(1) 提供无参和有参构造方法 (2) 为每个数据域提供get和set方法 (3) 提供方法double getTotalPrice()计算总价（面积*单价）",
     "public class House {\n    private int id;\n    private String address;\n    private double area;\n    private double price;\n    public House() {}\n    public House(int id, String address, double area, double price) {\n        this.id = id; this.address = address; this.area = area; this.price = price;\n    }\n    public int getId() { return id; }\n    public void setId(int id) { this.id = id; }\n    public String getAddress() { return address; }\n    public void setAddress(String address) { this.address = address; }\n    public double getArea() { return area; }\n    public void setArea(double area) { this.area = area; }\n    public double getPrice() { return price; }\n    public void setPrice(double price) { this.price = price; }\n    public double getTotalPrice() { return area * price; }\n}",
     "code_design", "第9章 对象和类"),
    ("定义一个自定义异常类IllTriangleException，再定义一个Triangle三角形类，包含三个边长数据域。\n"
     "要求：(1) Triangle构造方法中检查任意两边之和是否大于第三边，如果不满足则抛出IllTriangleException\n"
     "(2) 提供方法double getArea()计算面积（海伦公式）",
     "class IllTriangleException extends Exception {\n    public IllTriangleException(String msg) { super(msg); }\n}\n\npublic class Triangle {\n    private double a, b, c;\n    public Triangle(double a, double b, double c) throws IllTriangleException {\n        if (a+b<=c || a+c<=b || b+c<=a)\n            throw new IllTriangleException(\"不能构成三角形\");\n        this.a = a; this.b = b; this.c = c;\n    }\n    public double getArea() {\n        double s = (a+b+c)/2;\n        return Math.sqrt(s*(s-a)*(s-b)*(s-c));\n    }\n}",
     "code_design", "第12章 异常处理和文本I/O"),
    ("定义接口Attackable（attack方法）和Jumpable（jump方法），定义抽象类Role（name属性+抽象方法describe），\n"
     "定义Warrior类和Mage类继承Role并实现Attackable和Jumpable接口。画出UML类图。",
     "interface Attackable { void attack(); }\ninterface Jumpable { void jump(); }\n\nabstract class Role {\n    protected String name;\n    public Role(String name) { this.name = name; }\n    public abstract void describe();\n}\n\nclass Warrior extends Role implements Attackable, Jumpable {\n    public Warrior(String name) { super(name); }\n    public void attack() { System.out.println(name + \" attacks with sword\"); }\n    public void jump() { System.out.println(name + \" jumps\"); }\n    public void describe() { System.out.println(\"Warrior: \" + name); }\n}\n\nclass Mage extends Role implements Attackable, Jumpable {\n    public Mage(String name) { super(name); }\n    public void attack() { System.out.println(name + \" casts spell\"); }\n    public void jump() { System.out.println(name + \" teleports\"); }\n    public void describe() { System.out.println(\"Mage: \" + name); }\n}",
     "code_design", "第13章 抽象类和接口"),
    ("定义一个二次方程类QuadraticEquation，私有数据域为a、b、c三个系数。\n"
     "要求：(1) 构造方法初始化三个系数 (2) 方法getDiscriminant()计算判别式b^2-4ac\n"
     "(3) 方法getRoot1()和getRoot2()计算两个根，若判别式<0抛出RootException异常",
     "class RootException extends Exception {\n    public RootException(String msg) { super(msg); }\n}\n\npublic class QuadraticEquation {\n    private double a, b, c;\n    public QuadraticEquation(double a, double b, double c) { this.a = a; this.b = b; this.c = c; }\n    public double getDiscriminant() { return b*b - 4*a*c; }\n    public double getRoot1() throws RootException {\n        double d = getDiscriminant();\n        if (d < 0) throw new RootException(\"无实根\");\n        return (-b + Math.sqrt(d)) / (2*a);\n    }\n    public double getRoot2() throws RootException {\n        double d = getDiscriminant();\n        if (d < 0) throw new RootException(\"无实根\");\n        return (-b - Math.sqrt(d)) / (2*a);\n    }\n}",
     "code_design", "第9章 对象和类"),
    ("根据以下UML类图写出完整程序（构造方法和成员方法均需实现）。\n"
     "类图描述：Person类（-name:String, -age:int）+ Student子类（-studentId:String）\n"
     "+ 每个类包含构造方法和get/set方法 + Student类重写toString()方法返回所有信息",
     "public class Person {\n    private String name;\n    private int age;\n    public Person() {}\n    public Person(String name, int age) { this.name = name; this.age = age; }\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n    public int getAge() { return age; }\n    public void setAge(int age) { this.age = age; }\n    @Override\n    public String toString() { return \"Person{name='\" + name + \"', age=\" + age + \"}\"; }\n}\n\nclass Student extends Person {\n    private String studentId;\n    public Student() {}\n    public Student(String name, int age, String studentId) {\n        super(name, age);\n        this.studentId = studentId;\n    }\n    public String getStudentId() { return studentId; }\n    public void setStudentId(String studentId) { this.studentId = studentId; }\n    @Override\n    public String toString() {\n        return \"Student{name='\" + getName() + \"', age=\" + getAge() + \", studentId='\" + studentId + \"'}\";\n    }\n}",
     "code_design", "第11章 继承和多态"),
]

for stem, ans, ex_type, ch_name in code_design:
    ch_id = get_ch(ch_name.split(" ")[0])
    db.add(Question(
        subject_id=4, chapter_id=ch_id, type="essay",
        stem=stem, options=None, answer=ans,
        exam_type=ex_type, source_document="PDF模拟卷", is_ai_generated=False,
        difficulty="hard", tags=[]
    ))
print(f"Imported {len(code_design)} code design questions")

db.commit()
total = db.query(Question).filter(Question.subject_id == 4).count()
print(f"\nDone! Total {total} questions for Java subject.")
db.close()
