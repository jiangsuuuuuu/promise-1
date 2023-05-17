// 这里我们使用es5的方法来进行模块化操作，这样另一个文件就能使用当前文件中的方法了

// 1. promise原理
// 1.我们在全局(也就是window)中定义promise方法，
// 2.由于另一个文件中在在使用这个方法，而方法中是接收了一个参数为函数形式的
window.Promise = function (fn) {
  // 下面只要时往this中保存的变量时都是往window中添加属性的
  const self = this;
  // 11.定义保存then函数的变量,保存的形式是数组形式的，这样then在多次调用的时候也不会产生多个元素
  /* 
   12. 保存then的参数的作用，
    - 第一：在promise中语法是异步执行的，所以then就会先被执行的，所以这里就要把then的参数保存起来，这样promise执行完了就可以调用then的参数了
  */
  self.callbacks = [];

  // 13.在定义用来保存成功数据和失败数据的变量
  self.data = null;
  // 14.在定义用来保存状态的变量
  self.state = "pending";

  // 在promise中，我们一定执行第一个promise对象，就不能执行第二个promise对象了，所以这里我们进行判断，如果第一个promise执行好了，就不能执行第二个promise对象

  // 4.我们要定义success和failure这二个函数，并传入到fn函数中去，这样用户才能根据这二个函数来操作成功和失败的数据
  // 5. resolve操作成功的函数,resolve函数中只能接收一个参数进来，多余的参数会被忽略掉
  const resolve = function (value) {
    //只要调用resolve方法就会先进行判断，如果状态为初始值就执行当前方法的操作，如果不为初始值就说明已经有一个函数在使用了，就不能在使用成功或者失败的函数了
    if (self.state != "pending") {
      return;
    }
    // 7.如果请求的数据是成功的数据就会进入成功的函数，并执行如下方法
    //修改state为fulfilled
    self.state = "fulfilled";

    //修改data值为当前成功的值
    self.data = value;

    // 执行then中的参数，不过要主要了then中的参数要异步去执行，所以promise为了保证在不影响其他的语法前执行，就把then中的参数放在微任务队列去了
    // 这里因为微任务比较难写，这里就先使用宏任务，
    setTimeout(() => {
      // 我们还要循环数组中的参数，把指定的参数进行执行
      self.callbacks.forEach((obj) => {
        // 调用对象中的onFulfilled函数,并把成功的数据进行传入
        obj.onFulfilled(self.data);
      });
    }, 0);
  };
  // 6. reject操作失败的函数，reject函数也是一样的，只能接收一个参数进来
  const reject = function (cause) {
    if (self.state != "pending") {
      return;
    }

    self.state = "rejected";
    self.data = cause;

    setTimeout(() => {
      // 我们还要循环数组中的参数，把指定的参数进行执行
      self.callbacks.forEach((obj) => {
        // 调用对象中的onFulfilled函数,并把成功的数据进行传入
        obj.onFailed(self.data);
      });
    }, 0);
  };

  // 3.我们先执行fn函数,而fn函数中会传入二个函数。一个为成功的函数，另一个为失败的函数
  // 15.我们在执行捕获错误信息的操作，有可以我们在异步请求时，要手动抛出去错误信息
  try {
    fn(resolve, reject);
  } catch (error) {
    // 如果有错误信息，我们就把错误信息放在then中的onFailed函数去,注意了一定要是异步执行，因为这是promise
    setTimeout(() => {
      self.callbacks.forEach((obj) => {
        obj.onFailed(error);
      });
    }, 0);
  }
};

// 2. then方法原理
// 8.我们还要进行自定义编写then方法,以为then方法是promise实例的方法，所以我们必须要在promise原型链中进行编写
// 9.then方法接收二个参数，这二个参数为成功和失败的函数
// then方法在promise中是核心方法,因为下面的方法都是在调用then来进行操作的
Promise.prototype.then = function (onFulfilled, onFailed) {
  const caller = this;
  let onFailed1 = null;
  let onFulfilled1 = null;

  //这个定时器是判断onFulfilled和onFailed是否是函数形式的
  // 而定时器中的内容是关于判断当前方法中是否传入函数形式的，这里之所以使用定时器来进行判断，是因为在执行onFulfilled和onFailed时会先执行定时器中的操作
  setTimeout(() => {
    // 判断onFulfilled和onFailed变量是否为函数形式的，如果为就把当前的函数赋值给相当于的变量
    // 如果不为函数形式的，就赋值一个新的函数，并在新的函数中添加相对于的值
    if (typeof onFailed === "function") {
      onFailed1 = onFailed;
    } else {
      // 如果不是函数形式，就赋值一个新的函数,而新的函数中我们直接使用throw来进行抛出promise的错误信息,下面就会捕获这个错误信息
      onFailed1 = () => {
        throw caller.data;
      };
    }
    // 成功函数
    if (typeof onFulfilled === "function") {
      // 成功的函数也是一样的,如果为函数形式的就返回当前的函数
      onFulfilled1 = onFulfilled;
    } else {
      // 如果不为函数,还是返回一个新的函数,而新的函数中我们返回promise的成功信息,下面就会去根据返回的结果来进行判断,因为返回的结果是js类型的,所以下面就会把当前成功信息抛出去给下一个then捕获
      onFulfilled1 = () => {
        return caller.data;
      };
    }
  }, 0);
  // 16.这里要进行判断promise是否是同步执行的，由于promise中的then参数是异步执行的，所以当前then中的语法也会执行的
  //在当前then方法中我们return新的promise出去，这样就可以使用链式调用了
  return new Promise((resolve, reject) => {
    // 我们把then返回值的原理使用一个函数来进行封装，方便利用,这里主要是让then中的使用
    const CommonFunction = (name) => {
      //   name();
      // 捕获then中的错误
      try {
        //  如果promise为同步执行的，我们就在这里把then返回的值进行处理并返回新的promise对象
        let promise = name(caller.data);
        // 我们在对成功函数返回来的值进行判断,使用instanceof属性来进行判断promise
        if (promise instanceof Promise) {
          // 进行则是promise对象形式的,并进行判断只要不是为pending值，都进行相当于的操作，如果是pending就什么也干
          if (promise.state == "fulfilled") {
            resolve(promise.data);
          } else if (promise.state == "rejected") {
            reject(promise.data);
          }
        } else {
          // 进行则是js形式的值
          resolve(promise);
        }
      } catch (error) {
        // 如果跑出错误的信息，就把错误信息在下一个then中的失败函数中显示
        reject(error);
      }
    };

    //  这里我们还是写一下，关于promise同步执行的问题
    // 这里我们对state进行判断状态，因为promise不管执行resolve或者reject都会赋值不同的状态，我们在根据不同的状态来进行判断就知道同步的promise在执行成功的还是失败的函数
    if (this.state == "fulfilled") {
      // 注意了，调用then中的参数一定要是异步的
      setTimeout(() => {
        CommonFunction(onFulfilled1);
      }, 0);
    } else if (this.state == "rejected") {
      setTimeout(() => {
        CommonFunction(onFailed1);
      }, 0);
    } else if (this.state == "pending") {
      // 这里面就是关于promise异步的操作
      // 10. 调用window上的callbacks的属性
      this.callbacks.push({
        // 这里我们要把then中的参数进行包裹一个函数在外面，这样我们就可以在这里进行相对于的操作了
        onFulfilled: (value) => {
          // 这里之所以不用使用异步，是因为在promise中已经使用了，这里也是会被promise影响到的
          CommonFunction(onFulfilled1);
        },
        onFailed: () => {
          CommonFunction(onFailed1);
        },
      });
    }
  });
};

// 3.promise原型链中catch方法原理
// 定义cause获取失败信息的函数
// 注意了：catch只传入一个参数，这个参数只能是失败的信息
Promise.prototype.catch = function (onFailed) {
  // catch方法也的原理也跟then是一样的,所以这里我们直接使用then的操作
  // catch方法也是要以promise对象形式的,这里直接返回then方法中的promise对象
  // 我们返回的promise对象都是以promise的基本原理为基础的.如:window.Promise = function(){}
  let a = this.then(null, onFailed);
  return a;
};

//4.定义reject方法.主要了reject是一个静态的方法,不是在原型链中的方法
// reject方法只接收一个参数,这个参数就是错误的信息
Promise.reject = function (onFailed) {
  console.error(onFailed);
  //该方法返回的对象是promise的,,注意了,我们定义的promise都是在上面写好的,我峨嵋你使用的属性和方法都是上面的promise中的
  return new Promise((resolve, reject) => {
    // 因为reject只接收错误的信息,所以我们直接使用promise的onFailed1函数
    reject(onFailed);
  });
};

//5. 定义resolve方法,该方法也是一个静态方法
/*
    该方法也是只接收一个参数的,而这个参数可以是js类值,也可以是promise对象形式的
        - js类型的值都是调用成功函数的
        - 而promise形式的,就要看promise本身是调用什么函数了,如:调用resolve函数,那就调用调用resolve函数,则相反就问reject函数
*/
Promise.resolve = function (uncertainty) {
  // 该方法返回的也是promise形式的,这个promise是抛出去的,其中有当前resolve方法的相当于的值
  return new Promise((resolve, reject) => {
    if (uncertainty instanceof Promise) {
      // 如果为promise我们还需要进行判断,因为promise中有成功和失败的函数
      //  如果为promise形式的,我们是可以通过状态来进行判断,因为上面我们已经使用过了,这里我们就使用then来进行判断,因为主要是promise就能使用then
      uncertainty.then(
        // 我们在利用then中的二个函数来进行判断并赋值,
        // 注意了:我们直接写参数名是因为,参数本身就是一个函数形式,而then中的参数刚好也是函数形式的,我们传入的resolve和reject刚好匹配,所以我们可以直接使用resolve和reject函数
        resolve,
        reject
      );
    } else {
      //先处理js类型的值, 如果为js类型的,直接调用成功函数,而返回的promise中就会有当前的值和状态
      resolve(uncertainty);
    }
  });
};

//6.  Promise.resolveDelay()方法的原理
Promise.resolveDelay = function (uncertainty, time) {
  // 该方法返回的也是promise对象形式的
  return new Promise((resolve, reject) => {
    // 添加一个定时器,只有到了指定的的时间才能执行
    setTimeout(() => {
      Promise.resolve(uncertainty).then(resolve, reject);
    }, time);
  });
};

//7.Promise.rejectDelay()方 法的原理
Promise.rejectDelay = function (onFailed, time) {
  // 该方法返回的也是promise对象形式的
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 这里我们直接使用then老操作失败的函数，失败的操作不需要进行判断各种值的
      // 这里要进行判断一下，只要判断为，如果是js类型值也执行失败函数，如果为promise不管成功还是失败都执行失败函数
      if (onFailed instanceof Promise) {
        onFailed.then(null, reject);
      } else {
        // reject(onFailed);
        // then(null,reject(onFailed))
        reject(onFailed);
      }
    }, time);
  });
};

//8. promise.race()方法的原理
Promise.race = (ArrayRace) => {
  // 首先该方法返回的也是promise形式的
  return new Promise((resolve, reject) => {
    // 在进行判断，因为我们要的值都在数组里面，我们判断数组中的值，我们是无法获取第一个完成的值的
    ArrayRace.forEach((obj) => {
      // 我们还要进行判断一下，如果数组中有不为promise的，我们就直接使用成功的函数
      if (obj instanceof Promise) {
        // 这里要进行判断，只能获取第一个值，一旦获取了第一个值，后面的值就不会在进行操作的
        // 原理如：如果数组中的元素是异步执行的，那肯定还在最后执行的，我们只要获取第一个执行完了的值就行，
        obj.then(
          (value) => {
            // 只要我们执行resolve还在reject函数就会进行判断当前的状态值，如果当前promise的状态不是初始值就说明已经获取过了，那下一个函数就不能执行了
            resolve(value);
          },
          (a) => {
            reject(a);
          }
        );
      } else {
        resolve(obj);
      }
    });
  });
};

//9. promise.all()方法的原理
Promise.all = (ArrayRace) => {
  // 先根据原理数组生成一个新的数组，这个新数组的作用是用来保存已经执行完毕的值的，注意了保存的值也是跟原数组的位置是一样的
  let arr = new Array(ArrayRace.length - 1);
  // 在定义一个变量用于保存成功的函数执行了几个，注意了失败的函数是不进行保存的
  let quantity = 0;

  // 该方法返回的也是以promise形式的
  return new Promise((resolve, reject) => {
    ArrayRace.forEach((obj, index) => {
      // 先进行判断数组中每一个元素是否是promise对象形式的
      if (obj instanceof Promise) {
        obj.then(
          (value) => {
            // 只要执行了成功的函数，我们就进把成功的值保存在新的数组中，注意是要根据下标来进行保存
            arr[index] = value;
            // 每执行一个成功的函数都把quantity变量加一
            quantity += 1;
            // 在进判断，如果quantity数字得到了原数组中的长度就说明元数组中全是成功的函数，我们就把新的数组赋值，并抛出去
            // 注意了：元数组中只要有一个元素是失败的函数，quantity是不会进行相加的，而且我们这样判断的话，如果元数组中全部都是成功的，判断中的操作只会在元数组中的最后一个元素身上操作的，因为执行原因
            if (quantity == ArrayRace.length) {
              resolve(arr);
            }
          },
          // 如果元数组中有一个或者一个以上的元素是失败的，那成功那边的判断就不会执行的，直接把第一个失败的结果抛出去，注意了，失败不会以数组形式的
          reject
        );
      } else {
        // 这里是js类型的值，js类型的值都是成功的，所以我们直接往新数组中添加就行，并且数字加一
        quantity += 1;
        arr[index] = obj;
      }
    });
  });
};
