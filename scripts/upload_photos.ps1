$baseUrl = "https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/order-media/orders"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eHFqeXJwanF4dXRwanF1bWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDc0MTEsImV4cCI6MjA5NDk4MzQxMX0.43A8L0U6MTIhPunD3aQHKkxquarfBy87rUmxj9Vvs5U"
$folder = "F:\fotos"

$files = Get-ChildItem $folder -Filter *.jpg

foreach ($file in $files) {
    Write-Host "Uploading $($file.Name)..."
    $uploadUrl = "$baseUrl/$($file.Name)"

    & curl.exe -X POST $uploadUrl `
        -H "Authorization: Bearer $key" `
        -H "apikey: $key" `
        -H "Content-Type: image/jpeg" `
        --data-binary "@$($file.FullName)"

    Write-Host "`nFinished $($file.Name)"
}
Write-Host "All Done!"
