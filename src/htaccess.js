{
    /* <IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite existing files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Rewrite everything else to index.html
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType application/wasm .wasm
</IfModule> */
}
