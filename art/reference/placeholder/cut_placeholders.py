from PIL import Image, ImageDraw
import colorsys, math
src=Image.open('/home/user/Ants/art/reference/ant-concept.webp').convert('RGB')
OUT='/home/user/Ants/art/reference/placeholder/'
def key(im,bg,lo=22,hi=48):
    im=im.convert('RGBA'); px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]; d=math.dist((r,g,b),bg)
            if d<hi: px[x,y]=(r,g,b,min(a,int(255*max(0,(d-lo)/(hi-lo)))))
    return im
def erase(im,rects,off):
    d=ImageDraw.Draw(im)
    for x0,y0,x1,y1 in rects: d.rectangle((x0-off[0],y0-off[1],x1-off[0],y1-off[1]),fill=(0,0,0,0))
def recolor(im,ymax,team):
    px=im.load(); w,h=im.size
    th={'a':(205/360,0.95,0.95),'b':(40/360,1.0,1.15)}[team]
    for y in range(min(h,ymax)):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a==0: continue
            hh,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if 0.06<hh<0.16 and s>0.2 and v>0.25:
                nv=min(1,v*th[2]); ns=max(s,0.7)*th[1]
                rr,gg,bb=colorsys.hsv_to_rgb(th[0],min(1,ns),nv)
                px[x,y]=(int(rr*255),int(gg*255),int(bb*255),a)
    return im
bg=(235,225,200)
# hero
box=(62,112,352,560); hero=key(key(src.crop(box),bg),(222,206,172),14,34)
erase(hero,[(252,378,362,442),(60,140,146,172),(60,172,116,250)],box[:2])
hero.save(OUT+'hero.png')
for t in 'ab': recolor(hero.copy(),130,t).save(OUT+f'hero-{t}.png')
# side
box=(372,92,660,360); side=key(key(src.crop(box),bg),(222,206,172),14,34)
erase(side,[(360,138,516,202)],box[:2])
side.save(OUT+'side.png')
for t in 'ab': recolor(side.copy(),115,t).save(OUT+f'side-{t}.png')
# faces (tiles kept)
for n,b in {'cocky':(712,50,846,172),'aim':(858,50,992,172),'oops':(712,198,846,322),'dizzy':(858,198,992,322)}.items():
    src.crop(b).save(OUT+f'face-{n}.png')
