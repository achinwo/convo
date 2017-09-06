/**
 * Created by anthony on 01/09/2017.
 */
const http = require('http')
const _ = require('lodash')

function topic(topicName, fn) {
    fn.topic = topicName
    return fn
}

class MessageHandler {
    
    get topicMap() {
        if(this._typeMap) return this._typeMap
        
        this._typeMap = _(Object.getOwnPropertyNames(this.constructor.prototype))
            .filter((propName) => {
                if(propName === 'topicMap') return false
                return _.has(this[propName], 'topic')
            })
            .map((topicPropName) => {
                let funcObj = this[topicPropName]
                return [funcObj.topic, funcObj.bind(this)]
            })
            .fromPairs()
            .value()
        return this._typeMap
    }
}



MessageHandler.prototype.topics = topic('/topics', function (wsHandler, msg) {
    
    return {hello: 'world'}
})

if (module === require.main) {
    let x = new MessageHandler()
    console.log(x.topicMap())
}

module.exports = {MessageHandler}