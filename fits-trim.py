"""Create a smaller .fits file from an existing one

Usage:

    $ python fits-trim.py <file-to-trim> <number-of-frames-to-use>

Creates:

    A new file named "trim_<file-to-trim>"

"""

import os
import sys

from astropy.io import fits

def trim(filename, n_frames):
    try:
        hdulist = fits.open(filename)
        data = hdulist[0].data

        trimmed = data[:n_frames]
        out_hdu = fits.PrimaryHDU(trimmed)
        out_hdu.writeto(f'trim_{os.path.basename(filename)}')

    finally:
        hdulist.close()


if __name__ == '__main__':
    args = sys.argv
    trim(args[1], int(args[2]))
