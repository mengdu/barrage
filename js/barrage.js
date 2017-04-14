(function(){
// 获取支持的transition事件
function getTransitionEndEventName () {
    var obj = {
        'WebKitTransitionEvent': 'webkitTransitionEnd',
        'TransitionEvent': 'transitionend',
        'MozTransitionEvent': 'MozTransitionend',
        'OTransitionEvent': 'oTransitionEnd'
    }, ret;
    for (var key in obj) {
        try {
            document.createEvent(key);
            ret =  obj[key];
        } catch (ex) { }
    }
    getTransitionEndEventName = function(){
        return ret
    }
    return ret;
}
// 获取指定class的祖先
function getParent(node, className) {
    if (node.className && node.className.indexOf(className) > -1) {
        return node
    } else {
        if (node.parentNode) {
            return getParent(node.parentNode, className)
        } else {
            return null
        }
    }
}
// 高频事件防抖
/**
* 高频事件防抖
* @{func} function
* @{wait} 等待时间（多久执行一次）
***/
function debounce (func, wait) {
    var clock = null;
    wait = ~~wait
    return function(){
        var context = this,
            args = arguments;
        if (wait === 0) {
            return func.apply(context, args)
        }
        var call = !clock
        if (!clock && wait > 0) {
            clearTimeout(clock)
            clock = setTimeout(function () {
                clock = null
            }, wait)
        }
        if (call) func.apply(context, args)
    };
}

function mergeConf (defaultObj, newObj) {
    if (!newObj) {
        return defaultObj
    }
    var i = 0
    for (i in defaultObj) {
        if (typeof newObj[i] !== 'undefined' && newObj[i] !== NaN) {
            defaultObj[i] = newObj[i]
        }
    }
    return defaultObj
}

var d = {
    name: 'xx',
    age: 234,
    arr: [],
    isLoop: true,
}
console.log(mergeConf(d,{age: 345, isLoop: false}))

var STATUS_INIT = 1
var STATUS_RUNNING = 2
var STATUS_PAUSE = 3
var MAX_RUNNING = 30
function barrage (wrapper, config) {
    this.status = STATUS_INIT
    this.waitingList = []
    this.runningList = []
    this._count = 0
    this.conf = mergeConf({
        wrapperClass: 'barrage-wrapper full',
        barrageClassPrefix: 'barrage',
        barrageAnimationClass: 'animation',
        maxRunning: MAX_RUNNING,
        lineHeight: 48,
        hasClose: true,
        hasImg: true,
        isLoop: true,
        // 显示位置 top/bottom/middle/full
        position: 'full'
    }, config)

    this.init(wrapper)
}
barrage.prototype.init = function(wrapper) {
    if (typeof wrapper === 'string') {
        var wrap = document.getElementById(wrapper)
        if (wrap) {
            this.wrapper = wrap
        } else {
            this.wrapper = document.createElement('div')
            document.body.appendChild(this.wrapper)
        }
    } else {
        if (wrapper instanceof Element){
            this.wrapper = wrapper
        } else {
            throw new error("初始化对象不是Element");
        }
    }
    var that = this
    this.wrapper.className = this.conf.wrapperClass
    this.wrapper.addEventListener(getTransitionEndEventName(), function (e) {
        // console.log(e.target, e.target['data-id'])
        e.stopPropagation()
        // 弹幕运动结束
        if (e.target.className.indexOf(that._class('box')) > -1) {
            // 如果等待队列没内容
            if (that.waitingList.length <= 0) {
                // 如果正在运行列表大于最大运行列表，则移除
                if (that.conf.isLoop && that.runningList.length <= that.conf.maxRunning) {
                    e.target.className = that._class('box')
                    that._goRun(e.target)
                } else {
                    that._remove(e.target)
                }
            } else {
                // 如果正在运行列表小于最大运行列表，则移除
                if (that.runningList.length <= that.conf.maxRunning) {
                    var newMsg = that.waitingList.shift()
                    console.log("入场：", newMsg)
                    // 入场新的信息
                    that._run(newMsg)
                }
                // 出场当前信息
                that._remove(e.target)
            }
        }
    }, false)
    // 删除一个弹幕
    this.wrapper.addEventListener('click', function (e) {
        if (e.target.className === that.conf.barrageClassPrefix + '-btn-close') {
            console.log('删除元素')
            // e.target.parentNode.parentNode.remove()
            that._remove(e.target.parentNode.parentNode)
        }
        e.stopPropagation()
    }, false)
    
    var hanldeMouseover = debounce(function (e) {
        console.log("=======", that.status , STATUS_PAUSE)
        if (that.status != STATUS_PAUSE) {
            var parent = getParent(e.target, that._class('box'))
            if (parent) {
                var css = getComputedStyle(parent)
                parent.style['transform'] = css['transform']
                parent.className = that._class('box')
                parent.removeEventListener('mouseleave', handleHover, false)
                function handleHover (e) {
                    console.log('离开: ', e.target)
                    parent.style['transform'] = ''
                    parent.className = that._class('box') + ' ' + that._class('animation')
                    parent.removeEventListener('mouseleave', handleHover, false)
                    e.stopPropagation()
                }
                parent.addEventListener('mouseleave', handleHover, false)
            }
        }
        e.stopPropagation()
    }, 100)
    // 悬停弹幕
    this.wrapper.addEventListener('mouseover', hanldeMouseover, false)

    /*window.addEventListener("blur", function (e) {
        if(that.status === STATUS_RUNNING) {
            that.pause()
        }
    }, false)
    window.addEventListener("focus", function (e) {
        if(that.status === STATUS_PAUSE) {
            that.start()
        }
    }, false)*/
}
barrage.prototype.send = function(msg) {
    // 如果当前运行不超过最大运行
    if (this.runningList.length < this.conf.maxRunning) {
        this._run(msg)
    } else {
        this.waitingList.push(msg)
    }
};
barrage.prototype.clear = function(isAll) {
    var i = 0
    for (i in this.runningList) {
        this.runningList[i].target.remove()
    }
    this.runningList = []
    if (isAll) {
        this.waitingList = []
    } else {
        var i = 0,
            len = this.waitingList.length > this.conf.maxRunning ? this.conf.maxRunning : this.waitingList.length
        while (i < len) {
            var msg = this.waitingList.shift()
            console.log(msg, i)
            this._run(msg)
            i++
        }
    }
};
barrage.prototype.pause = function() {
    var i = 0
    for (i in this.runningList) {
        var css = getComputedStyle(this.runningList[i].target)
        console.log(css['transform'])
        // 设置位置
        this.runningList[i].target.style['transform'] = css['transform']
        // 清除动画class
        this.runningList[i].target.className = this._class('box')
    }
    this.status = STATUS_PAUSE
};
barrage.prototype.start = function() {
    if (this.status === STATUS_PAUSE) {
        this.status = STATUS_RUNNING
        for (var i in this.runningList) {
            this.runningList[i].target.style['transform'] = ''
            this.runningList[i].target.className = this._class('box') + ' ' + this._class('animation')
        }
    } else {
        this.status = STATUS_RUNNING
        var i = 0
        for (i in this.runningList) {
            this._goRun(this.runningList[i].target)
        }
    }
};
barrage.prototype._run = function(msg) {
    var msgBox = document.createElement('DIV')
    var that = this
    var dataId = this._count++
    msgBox.className = this._class('box')
    
    msgBox['data-id'] = dataId
    // msgBox.style.marginTop = that.conf.lineHeight * rand(20) + 'px'
    msgBox.innerHTML = _getMsgBoxHtml(msg, this.conf)
    this.wrapper.appendChild(msgBox)
    this.runningList.push({
        target: msgBox,
        id: dataId
    })
    this._goRun(msgBox)
};
barrage.prototype._goRun = function (target) {
    var that = this
    var wrapperHeight = b.wrapper.clientHeight || document.documentElement.clientHeight;
    var top = 0
    var rand = Math.random()
    switch (this.conf.position) {
        case 'top': 
            top = wrapperHeight * 0.5 * rand
        break
        case 'bottom': 
            var p = wrapperHeight * 0.5 * rand + wrapperHeight * 0.5
            top = (p + 40) > wrapperHeight ? p - 40 : p
        break
        case 'middle': 
            top = wrapperHeight * 0.5 * rand + wrapperHeight * 0.25
        break
        default:
            var top = wrapperHeight * Math.random()
            top = (top + 40) > wrapperHeight ? top - 40 : top
    }
    target.style.top = top + 'px'
    var time = Math.random()*2000
    console.log(time)
    setTimeout (function () {
        if (that.status === STATUS_RUNNING) {
            target.className = that._class('box') + ' ' + that._class('animation')
        }
    },  time)
}
barrage.prototype._remove = function (target) {
    var i = 0, len = this.runningList.length
    for (;i < len; i++) {
        if (this.runningList[i].id === target['data-id']) {
            target.remove()
            this.runningList.splice(i, 1)
            break;
        }
    }
}
barrage.prototype._class = function (className) {
    return this.conf.barrageClassPrefix + '-' +className
}
function _getMsgBoxHtml (msg, conf) {
    var html = ''
    if (conf.hasImg) {
        html += '<div class="' + conf.barrageClassPrefix + '-user">';
        html += '<img src="' + msg.img + '" class="' + conf.barrageClassPrefix + '-img" />';
        html += '</div>';
    }
    html += '<div class="' + conf.barrageClassPrefix + '-content">';
    html += '<span class="' + conf.barrageClassPrefix + '-content-text">' + msg.content + '</span>';
    html += '</div>';
    if (conf.hasClose) {
        html += '<div class="' + conf.barrageClassPrefix + '-control">';
        html += '<span class="' + conf.barrageClassPrefix + '-btn-close">×</span>';
        html += '</div>';
    }
    return html;
}

window.barrage = barrage

})();