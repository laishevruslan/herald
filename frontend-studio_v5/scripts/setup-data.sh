data=$1
core=$2

rm -r $core/public/static
ln -s $(pwd)/$data/static $(pwd)/$core/public/static

rm -r $core/public/local
ln -s $(pwd)/$data/local $(pwd)/$core/public/local
rm -r $core/src/assets/local
mkdir $core/src/assets/local
# ln -s $(pwd)/$data/local/config.json $(pwd)/$core/public/local/config.json
ln -s $(pwd)/$data/local/buefy.scss $(pwd)/$core/src/assets/local/buefy.scss
mkdir $core/src/assets/local/data
ln -s $(pwd)/$data/local/data/templates.json $(pwd)/$core/src/assets/local/data/templates.json
ln -s $(pwd)/$data/local/i18n $(pwd)/$core/src/assets/local/i18n

rm -r $core/public/favicon.ico
ln -s $(pwd)/$data/favicon.ico $(pwd)/$core/public/favicon.ico

rm -rf $core/public/.htaccess
if [ -f $(pwd)/$data/.htaccess ]; then
    ln -s $(pwd)/$data/.htaccess $(pwd)/$core/public
fi

rm -rf $core/public/.htpasswd
if [ -f $(pwd)/$data/.htpasswd ]; then
    ln -s $(pwd)/$data/.htpasswd $(pwd)/$core/public
fi
