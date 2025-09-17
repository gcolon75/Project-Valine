export function paginate(list,page=0,size=10){const start=page*size;return list.slice(start,start+size)}
