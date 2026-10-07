
$(function () {

  function doSuit(el, pageWidth, pageHeight) {
    var h = pageHeight
    var w = pageWidth
    var iw = window.innerWidth
    var ih = window.innerHeight
    el.style.transformOrigin = '0 0'
    el.style.overflow = 'hidden'
    console.log(!!window.ActiveXObject || "ActiveXObject" in window)
    el.style.transform = `scale(${iw / w},${ih / h})`
  }

  function autoSuit(el, pageWidth, pageHeight) {
      window.addEventListener('resize', () => {
        doSuit(el, pageWidth, pageHeight)
      })
  }
  getBrowser()
  // if (window.innerWidth < 1450) {
  //   autoSuit(document.body, 1600, 2800)
  // }
  // alert(window.innerWidth)
  function getBrowser(){ //�ゆ�㊥�茹�������android膤紫�筝�菴�����ios膤紫�筝�
    if ((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
      if(window.innerWidth < 1450)  {
        autoSuit(document.body, 1600, 2800)
      }
    }
  }
  document.body.style.opacity = 1
})
