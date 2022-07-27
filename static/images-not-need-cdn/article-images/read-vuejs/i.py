from  moviepy.editor import *

clipVideo = VideoFileClip(r"./分支切换与cleanup.m4v")
clipVideo.write_gif(r"./分支切换与cleanup.gif", None, program='imageio',
                  opt='nq', fuzz=1, verbose=True,
                  loop=0, dispose=False, colors=None, tempfiles=False,
                  logger='bar')
