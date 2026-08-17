import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class GenerateAndroidIcons {
  static final String[] D={"mdpi","hdpi","xhdpi","xxhdpi","xxxhdpi"};
  static final int[] L={48,72,96,144,192}, A={108,162,216,324,432};
  public static void main(String[] z)throws Exception{
    System.setProperty("java.awt.headless","true");
    Path root=Paths.get("").toAbsolutePath(),res=root.resolve("android/app/src/main/res");
    BufferedImage play=read(root.resolve("assets"),"icon-play.b64.part");
    BufferedImage fg=read(root.resolve("assets"),"icon-foreground.b64.part");
    size(play,512,512,"play"); size(fg,432,432,"foreground");
    for(int i=0;i<D.length;i++){
      Path p=res.resolve("mipmap-"+D[i]); Files.createDirectories(p); clean(p);
      png(legacy(play,L[i],false),p.resolve("ic_launcher.png"));
      png(legacy(play,L[i],true),p.resolve("ic_launcher_round.png"));
      BufferedImage f=resize(fg,A[i],A[i]);
      png(f,p.resolve("ic_launcher_foreground.png"));
      png(mono(f),p.resolve("ic_launcher_monochrome.png"));
    }
    Path drawable=res.resolve("drawable"); Files.createDirectories(drawable);
    Files.writeString(drawable.resolve("ic_launcher_background.xml"),"""
      <?xml version="1.0" encoding="utf-8"?>
      <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
        <gradient android:angle="135" android:startColor="#06483C" android:centerColor="#033B32" android:endColor="#012A24" android:type="linear" />
      </shape>
      """,StandardCharsets.UTF_8);
    adaptive(res.resolve("mipmap-anydpi-v26"),false);
    adaptive(res.resolve("mipmap-anydpi-v33"),true);
    String m=Files.readString(root.resolve("android/app/src/main/AndroidManifest.xml"));
    if(!m.contains("android:icon=\"@mipmap/ic_launcher\"")||!m.contains("android:roundIcon=\"@mipmap/ic_launcher_round\""))throw new IllegalStateException("launcher refs missing");
    png(store(play),root.resolve("assets/play-store-icon-512.png"));
    System.out.println("AI Contest Hub custom launcher icon applied");
  }
  static BufferedImage read(Path dir,String prefix)throws Exception{
    ArrayList<Path> ps=new ArrayList<>();
    try(DirectoryStream<Path>s=Files.newDirectoryStream(dir,prefix+"*")){for(Path p:s)ps.add(p);}
    ps.sort(Comparator.comparing(p->p.getFileName().toString()));
    if(ps.isEmpty())throw new IOException("missing "+prefix);
    StringBuilder b=new StringBuilder(); for(Path p:ps)b.append(Files.readString(p,StandardCharsets.US_ASCII).replaceAll("\\s+",""));
    BufferedImage im=ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(b.toString())));
    if(im==null)throw new IOException("invalid "+prefix); return im;
  }
  static void size(BufferedImage i,int w,int h,String n){if(i.getWidth()!=w||i.getHeight()!=h)throw new IllegalStateException(n+" size "+i.getWidth()+"x"+i.getHeight());}
  static Graphics2D g(BufferedImage o){Graphics2D g=o.createGraphics();g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY);return g;}
  static BufferedImage resize(BufferedImage s,int w,int h){BufferedImage o=new BufferedImage(w,h,BufferedImage.TYPE_INT_ARGB);Graphics2D g=g(o);g.drawImage(s,0,0,w,h,null);g.dispose();return o;}
  static BufferedImage legacy(BufferedImage s,int n,boolean round){BufferedImage o=new BufferedImage(n,n,BufferedImage.TYPE_INT_ARGB);Graphics2D g=g(o);g.setClip(round?new Ellipse2D.Double(0,0,n,n):new RoundRectangle2D.Double(0,0,n,n,n*.43,n*.43));g.drawImage(s,0,0,n,n,null);g.dispose();return o;}
  static BufferedImage store(BufferedImage s){int n=s.getWidth();BufferedImage o=new BufferedImage(n,n,BufferedImage.TYPE_INT_ARGB);Graphics2D g=g(o);g.setColor(new Color(0,44,36));g.fillRect(0,0,n,n);g.setClip(new RoundRectangle2D.Double(0,0,n,n,n*.28,n*.28));g.drawImage(s,0,0,null);g.dispose();return o;}
  static BufferedImage mono(BufferedImage s){BufferedImage o=new BufferedImage(s.getWidth(),s.getHeight(),BufferedImage.TYPE_INT_ARGB);for(int y=0;y<s.getHeight();y++)for(int x=0;x<s.getWidth();x++)o.setRGB(x,y,((s.getRGB(x,y)>>>24)&255)<<24|0xffffff);return o;}
  static void png(BufferedImage i,Path p)throws Exception{Files.createDirectories(p.getParent());if(!ImageIO.write(i,"png",p.toFile()))throw new IOException("png writer");}
  static void clean(Path p)throws Exception{for(String n:new String[]{"ic_launcher","ic_launcher_round","ic_launcher_foreground","ic_launcher_monochrome"})for(String e:new String[]{"png","webp"})Files.deleteIfExists(p.resolve(n+"."+e));}
  static void adaptive(Path p,boolean themed)throws Exception{Files.createDirectories(p);String mono=themed?"    <monochrome android:drawable=\"@mipmap/ic_launcher_monochrome\" />\n":"";String x="<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n    <background android:drawable=\"@drawable/ic_launcher_background\" />\n    <foreground android:drawable=\"@mipmap/ic_launcher_foreground\" />\n"+mono+"</adaptive-icon>\n";Files.writeString(p.resolve("ic_launcher.xml"),x);Files.writeString(p.resolve("ic_launcher_round.xml"),x);}
}
