const fs=require('fs')
  ,path=require('path')
function eq192(x,y,yi){
  return x[0]===y[yi]&&x[1]===y[yi+1]&&x[2]===y[yi+2]&&x[3]===y[yi+3]&&x[4]===y[yi+4]&&x[5]===y[yi+5]
}
function resistReplayAttack(walletDir,nonce){
  let noncePath=path.join(walletDir,'nonce')
  if(fs.existsSync(noncePath)){
    let x=new Uint32Array(nonce.buffer,nonce.byteOffset,6)
    let tempBuffer=fs.readFileSync(noncePath)
    let nonceLists=new Uint32Array(tempBuffer.buffer,tempBuffer.byteOffset,tempBuffer.length/4)
    for(let i=0;i<nonceLists.length;i+=6){
      if(eq192(x,nonceLists,i)){
        console.log('\x1b[31m%s\x1b[0m','警告: 你可能受到了重放攻击')
        return false
      }
    }
    fs.appendFileSync(noncePath,nonce)
  }else{
    fs.appendFileSync(noncePath,nonce)
  }
}
module.exports=resistReplayAttack
