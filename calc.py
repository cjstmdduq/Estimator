#!/usr/bin/env python3
import math
import argparse

def calc_puzzle(Wcm: int, Hcm: int):
    tile = 50
    nx = math.ceil(Wcm / tile)
    ny = math.ceil(Hcm / tile)
    pcs = nx * ny
    price = pcs * 9000
    return {
        'nx': nx,
        'ny': ny,
        'pcs': pcs,
        'wasteRate': 0.05,
        'price': price,
    }

def main():
    ap = argparse.ArgumentParser(description='Puzzle mat quick calc (50x50cm)')
    ap.add_argument('W', type=int, help='width in cm')
    ap.add_argument('H', type=int, help='height in cm')
    args = ap.parse_args()
    r = calc_puzzle(args.W, args.H)
    print(r)

if __name__ == '__main__':
    main()


