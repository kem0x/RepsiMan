cmake_minimum_required(VERSION 3.20)
project(PepsimanRecomp C CXX)

set(CMAKE_C_STANDARD 99)
set(CMAKE_CXX_STANDARD 17)

set(PSXRECOMP_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/psxrecomp" CACHE PATH
    "Path to the pinned PSXRecomp framework")

include("${PSXRECOMP_ROOT}/runtime/runtime.cmake")

set(PEPSIMAN_GENERATED_FULL
    "${CMAKE_CURRENT_SOURCE_DIR}/generated/SLPS_017.62_full.c")
set(PEPSIMAN_GENERATED_DISPATCH
    "${CMAKE_CURRENT_SOURCE_DIR}/generated/SLPS_017.62_dispatch.c")

if(EMSCRIPTEN)
    set(PEPSIMAN_DEFAULT_CONFIG "/game.toml")
else()
    set(PEPSIMAN_DEFAULT_CONFIG "game.toml")
endif()

psxrecomp_add_runtime_target(psx-runtime
    BIOS_INTERPRETER
    GAME_GENERATED_FULL_C "${PEPSIMAN_GENERATED_FULL}"
    GAME_GENERATED_DISPATCH_C "${PEPSIMAN_GENERATED_DISPATCH}"
    DEBUG_PORT 4471
    WINDOW_TITLE "Pepsiman Recompiled"
    DEFAULT_BIOS_PATH
        "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/openbios-fastboot.bin"
    DEFAULT_GAME_CONFIG_PATH "${PEPSIMAN_DEFAULT_CONFIG}"
)

target_compile_definitions(psx-runtime PRIVATE PEPSIMAN_SFX_RETRIGGER_GUARD=1)

if(EMSCRIPTEN)
    # Modern Chromium supports WebAssembly SIMD. MDEC's IDCT and the software
    # presentation loops are the limiting paths on two-core Windows handhelds;
    # enabling SIMD lets LLVM vectorize them without changing guest behavior.
    set_source_files_properties(
        "${PSXRECOMP_ROOT}/runtime/src/mdec.c"
        "${PSXRECOMP_ROOT}/runtime/src/gpu_sw_renderer.c"
        "${PSXRECOMP_ROOT}/runtime/src/main.cpp"
        PROPERTIES COMPILE_OPTIONS "-msimd128")
    target_link_options(psx-runtime PRIVATE "-msimd128")

    option(PEPSIMAN_WEB_PRELOAD_TEST_ASSETS
        "Bundle local disc files into a private browser test build" OFF)
    set_target_properties(psx-runtime PROPERTIES SUFFIX ".html")
    target_link_options(psx-runtime PRIVATE
        "-sINVOKE_RUN=0"
        "-sEXPORTED_RUNTIME_METHODS=FS,callMain"
        "SHELL:--shell-file ${CMAKE_CURRENT_SOURCE_DIR}/web/shell.html")
    set_property(TARGET psx-runtime APPEND PROPERTY LINK_DEPENDS
        "${CMAKE_CURRENT_SOURCE_DIR}/web/shell.html"
        "${CMAKE_CURRENT_SOURCE_DIR}/web/assets/title-logo-recompiled.png"
        "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/LICENSE"
        "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/openbios.bin"
        "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/openbios-fastboot.bin")
    add_custom_command(TARGET psx-runtime POST_BUILD
        COMMAND "${CMAKE_COMMAND}" -E make_directory
            "$<TARGET_FILE_DIR:psx-runtime>/assets"
        COMMAND "${CMAKE_COMMAND}" -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/web/assets/title-logo-recompiled.png"
            "$<TARGET_FILE_DIR:psx-runtime>/assets/title-logo-recompiled.png"
        COMMAND "${CMAKE_COMMAND}" -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/openbios.bin"
            "$<TARGET_FILE_DIR:psx-runtime>/openbios.bin"
        COMMAND "${CMAKE_COMMAND}" -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/openbios-fastboot.bin"
            "$<TARGET_FILE_DIR:psx-runtime>/openbios-fastboot.bin"
        COMMAND "${CMAKE_COMMAND}" -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/third_party/openbios/LICENSE"
            "$<TARGET_FILE_DIR:psx-runtime>/OPENBIOS-LICENSE.txt"
        VERBATIM)

    if(PEPSIMAN_WEB_PRELOAD_TEST_ASSETS)
        target_compile_definitions(psx-runtime PRIVATE PSX_WEB_TEST_ASSETS=1)
        set(_pepsiman_test_disc "${CMAKE_CURRENT_SOURCE_DIR}/PEPSIMAN")
        if(NOT EXISTS "${_pepsiman_test_disc}/Pepsiman (Japan).cue")
            message(FATAL_ERROR
                "PEPSIMAN_WEB_PRELOAD_TEST_ASSETS requires "
                "PEPSIMAN/Pepsiman (Japan).cue in the project root")
        endif()
        target_link_options(psx-runtime PRIVATE
            "SHELL:--preload-file ${_pepsiman_test_disc}@/game/disc")
        message(WARNING
            "Private WASM test build: local copyrighted disc assets are being "
            "bundled. Do not distribute build-web/*.data.")
    endif()
endif()
