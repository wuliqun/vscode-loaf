import * as fs from "fs";
import * as iconv from "iconv-lite";

function readFile(filePath: string) {
  const buffer = fs.readFileSync(filePath);

  let content = iconv.decode(buffer, "utf8");
  if (content.indexOf("�") !== -1) {
    content = iconv.decode(buffer, "gbk");
  }

  if (content.indexOf("�") !== -1) {
    content = iconv.decode(buffer, "gb2312");
  }

  return content;
}

const novelFileStr = `#include <iostream>
#include <thread>
#include <unistd.h>
#include <cassert>

using namespace std;

class background_task {
public:
    void operator()() const {
        cout << "ok" << endl;
    }
};

void do_something(int &i) {
    cout << "do_something" << endl;
}

struct func {
    int &i;

    func(int &i_) : i(i_) {}

    void operator()() {
        for (unsigned j = 0; j < 1000000; ++j) {
            do_something(i);           // 1. 潜在访问隐患：悬空引用
        }
    }
};

void f() {
    int some_local_state = 0;
    func my_func(some_local_state);
    std::thread t(my_func);
    try {
//        do_something_in_current_thread();
    }
    catch (...) {
        t.join();  // 1
        throw;
    }
    t.join();  // 2
}



/**********/



class thread_guard {
    std::thread &t;
public:
    explicit thread_guard(std::thread &t_) :
            t(t_) {}

    ~thread_guard() {
        if (t.joinable()) // 1
        {
            t.join();      // 2
        }
    }

    thread_guard(thread_guard const &) = delete;   // 3
    thread_guard &operator=(thread_guard const &) = delete;
};
void f1()
{
    int some_local_state=0;
    func my_func(some_local_state);
    std::thread t(my_func);
    thread_guard g(t);
//    do_something_in_current_thread();
}    // 4
// 当线程执行到4处时，局部对象就要被逆序销毁了。因此，thread_guard对象g是第一个被销毁的，
// 这时线程在析构函数中被加入2到原始线程中。
// 即使do_something_in_current_thread抛出一个异常，这个销毁依旧会发生。


int main() {

    background_task f;
//    thread t(f);       // ok
//    t.join();
    //声明一个名为my_threadx的函数,这个函数带有一个参数(函数指针指向没有参数并返回background_task对象的函数)，返回一个std::thread对象的函数
//    thread my_thread1(background_task());

    // 针对Most Vexing Parse问题解决如下：
//    thread my_thread1((background_task())); // 多组括号
//    my_thread1.join();
//    thread my_thread2{background_task()};   // 新的初始化语法
//    my_thread2.join();

//    thread myThread([](){
//        cout<<"ok"<<endl;
//    });
//    myThread.join();
    // 后台运行线程
    std::thread t(f);
    t.detach();
    assert(!t.joinable());

    return 0;
}
`;

function writeNovelFile(filePath: string) {
  fs.writeFileSync(filePath, novelFileStr, "utf8");
}

export { readFile, writeNovelFile };
