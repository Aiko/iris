//? type this if you'd like, it's unnecessary and too painful
export default = (obj: any, prefix = ''): any =>
    Object.keys(obj).reduce((res: Record<string, any>, el: string) => {
      //? Arrays are objects in JS -- we don't want to stratify them
      if (Array.isArray(obj[el])) return res

      if (typeof obj[el] === 'object' && obj[el] !== null )
        return {...res, ...stratify(obj[el], prefix + el + '.')}

      const key = prefix + el
      const tmp: Record<string, any> = {}
      tmp[key] = obj[el]
      return {...res, ...tmp}
    }, [])
;;