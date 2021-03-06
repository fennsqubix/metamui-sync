async function getVCs(provider) {
  return (await provider.query.vc.vCs.entries())
    .map(([{ args: [vcId] }, value]) => ({vcId, ...(value.toHuman())[0]}));
}

async function storeVC(vcHex, sudoKeyPair, provider, nonce) {
  return new Promise(async (resolve, reject) => {
    try {
      const tx = provider.tx.sudo.sudo(provider.tx.vc.store(vcHex));
      await tx.signAndSend(sudoKeyPair, {nonce}, function ({ status, dispatchError, events }) {
        if (status.isInBlock || status.isFinalized) {
          events
            .forEach(({ event : { data: [result] } }) => {
              if (result.isError) {
                let error = result.asError;
                if (error.isModule) {
                  const decoded = provider.registry.findMetaError(error.asModule);
                  const { docs, name, section } = decoded;
                  reject(`${section}.${name}`);
                } else {
                  reject(error.toString());
                }
              }
            });
        }
        if (dispatchError) {
          reject(new Error(dispatchError.toString()));
        } else if (status.isInBlock) {
          resolve('Success')
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


function checkVCEq(vcA, vcB) {
  let flag = true;
  if (vcA.is_vc_used !== vcB.is_vc_used) {
    flag = false;
  }
  if (vcA.owner !== vcB.owner) {
    flag = false;
  }
  if (vcA.vc_type != vcB.vc_type) {
    flag = false;
  }
  if (vcA.vc_property != vcB.vc_property) {
    flag = false;
  }
  vcA.issuers.forEach(is => {
    if(!vcB.issuers.includes(is)) {
      flag = false;
    }
  })
  vcA.signatures.forEach(sig => {
    if(!vcB.signatures.includes(sig)) {
      flag = false;
    }
  })
  return flag;
}

function checkVCsEqual(nodeAVCs, nodeBVCs) {
  // if (nodeAVCs.length != nodeBVCs.length) {
  //   return false;
  // }
  if(!nodeAVCs || nodeAVCs.length == 0) {
    return false;
  }
  let flag;
  nodeAVCs.forEach(vcA => {
    flag = true;
    let vcB: any = nodeBVCs.find((t: any) => t.hash == vcA.hash);
    if (!vcB) {
      flag = false;
      console.log({vcType: vcA.vc_type, vcA, vcB, msg: 'Not Equal'});
      return;
    }
    if(!checkVCEq(vcA, vcB)) {
      flag = false;
      console.log({vcType: vcA.vc_type, vcA, vcB, msg: 'Not Equal'});
    }
  });
  return flag;
}


export {
  getVCs,
  storeVC,
  checkVCsEqual,
}