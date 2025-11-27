#!/bin/bash
set -e

pcscd --auto-exit
sleep 2

exec ./atm atm.conf
